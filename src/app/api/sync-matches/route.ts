import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchBarcaMatchesFromApi, getSampleBarcaMatches, NormalizedMatch } from '@/lib/football-api';

export async function POST(request: Request) {
  try {
    const supabase = createClient();

    // Comprovació de seguretat: si hi ha un SYNC_SECRET_TOKEN configurat,
    // exigim que les crides externes (p. ex. un cron) el proporcionin.
    // L'accés des del Panell d'Administració ja està protegit pel PIN
    // (aquesta app no utilitza Supabase Auth, sinó selecció de perfil local).
    const secretToken = process.env.SYNC_SECRET_TOKEN;
    if (secretToken) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader !== `Bearer ${secretToken}`) {
        return NextResponse.json(
          { error: 'No autoritzat. Cal proporcionar el token secret.' },
          { status: 401 }
        );
      }
    }

    // 2. Comprovar si es demanen dades d'exemple o de l'API real
    const body = await request.json().catch(() => ({}));
    const useSample = Boolean(body.sample);
    const apiKey = process.env.FOOTBALL_DATA_API_KEY;
    const willCallRealApi = !useSample && !!apiKey && apiKey !== 'your_football_data_api_key_here';

    let matchesToSync: NormalizedMatch[] = [];

    if (willCallRealApi) {
      // Evitem trucar dues vegades a football-data.org dins del mateix minut
      // (protegim el límit de peticions/minut del pla gratuït).
      const { data: syncState } = await supabase
        .from('sync_state')
        .select('last_synced_at')
        .eq('id', 1)
        .maybeSingle();

      const now = new Date();
      const lastSyncedAt = syncState?.last_synced_at ? new Date(syncState.last_synced_at) : null;
      const sameMinute =
        lastSyncedAt && Math.floor(lastSyncedAt.getTime() / 60000) === Math.floor(now.getTime() / 60000);

      if (sameMinute) {
        return NextResponse.json({
          success: true,
          skipped: true,
          message: "Ja s'havia sincronitzat amb l'API fa menys d'un minut. S'evita repetir la crida.",
        });
      }

      try {
        matchesToSync = await fetchBarcaMatchesFromApi(apiKey!);
      } catch (apiErr: any) {
        console.warn('Error amb football-data.org API, usant dades de mostra com a alternativa:', apiErr.message);
        matchesToSync = getSampleBarcaMatches();
      }

      await supabase
        .from('sync_state')
        .update({ last_synced_at: now.toISOString() })
        .eq('id', 1);
    } else {
      matchesToSync = getSampleBarcaMatches();
    }

    if (!matchesToSync || matchesToSync.length === 0) {
      return NextResponse.json({ message: 'Cap partit trobat per sincronitzar.' });
    }

    // 3. Upsert a la base de dades
    let insertedCount = 0;
    let updatedCount = 0;
    let pointsCalculatedCount = 0;

    for (const match of matchesToSync) {
      // Buscar si ja existeix per external_id
      let existingMatchId: string | null = null;

      if (match.external_id) {
        const { data: existing } = await supabase
          .from('matches')
          .select('id, status, goals_barca, goals_rival')
          .eq('external_id', match.external_id)
          .maybeSingle();

        if (existing) {
          existingMatchId = existing.id;
        }
      }

      // Si no hem trobat res per external_id, comprovem si el partit ja
      // s'havia introduït a mà (sense external_id) el mateix dia, per
      // evitar duplicar-lo (independentment del nom del rival).
      if (!existingMatchId) {
        const matchDay = new Date(match.match_date);
        const dayStart = new Date(matchDay);
        dayStart.setUTCHours(0, 0, 0, 0);
        const dayEnd = new Date(matchDay);
        dayEnd.setUTCHours(23, 59, 59, 999);

        const { data: possibleDuplicate } = await supabase
          .from('matches')
          .select('id')
          .is('external_id', null)
          .gte('match_date', dayStart.toISOString())
          .lte('match_date', dayEnd.toISOString())
          .maybeSingle();

        if (possibleDuplicate) {
          existingMatchId = possibleDuplicate.id;
        }
      }

      if (existingMatchId) {
        // Actualitzar dades (especialment resultat i estat)
        const { error } = await supabase
          .from('matches')
          .update({
            external_id: match.external_id,
            competition: match.competition,
            rival: match.rival,
            rival_logo: match.rival_logo,
            match_date: match.match_date,
            home_away: match.home_away,
            goals_barca: match.goals_barca,
            goals_rival: match.goals_rival,
            status: match.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingMatchId);

        if (!error) {
          updatedCount++;

          // Si el partit ja ha finalitzat, calculem (o recalculem) els punts
          // de totes les porres fetes per aquest partit.
          if (match.status === 'finished') {
            const { error: rpcErr } = await supabase.rpc('calculate_match_points', {
              target_match_id: existingMatchId,
            });
            if (!rpcErr) pointsCalculatedCount++;
          }
        }
      } else {
        // Inserir nou partit
        const { data: inserted, error } = await supabase
          .from('matches')
          .insert({
            external_id: match.external_id,
            competition: match.competition,
            rival: match.rival,
            rival_logo: match.rival_logo,
            match_date: match.match_date,
            home_away: match.home_away,
            goals_barca: match.goals_barca,
            goals_rival: match.goals_rival,
            status: match.status,
          })
          .select('id')
          .single();

        if (!error) {
          insertedCount++;

          if (match.status === 'finished' && inserted) {
            const { error: rpcErr } = await supabase.rpc('calculate_match_points', {
              target_match_id: inserted.id,
            });
            if (!rpcErr) pointsCalculatedCount++;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sincronització completada amb èxit.`,
      stats: {
        totalReceived: matchesToSync.length,
        inserted: insertedCount,
        updated: updatedCount,
        pointsCalculated: pointsCalculatedCount,
        source: !useSample && apiKey ? 'football-data.org' : 'mostra',
      },
    });
  } catch (err: any) {
    console.error('Error en /api/sync-matches:', err);
    return NextResponse.json(
      { error: err.message || 'Error intern en sincronitzar' },
      { status: 500 }
    );
  }
}
