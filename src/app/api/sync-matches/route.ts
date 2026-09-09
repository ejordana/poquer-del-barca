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

    let matchesToSync: NormalizedMatch[] = [];

    if (!useSample && apiKey && apiKey !== 'your_football_data_api_key_here') {
      try {
        matchesToSync = await fetchBarcaMatchesFromApi(apiKey);
      } catch (apiErr: any) {
        console.warn('Error amb football-data.org API, usant dades de mostra com a alternativa:', apiErr.message);
        matchesToSync = getSampleBarcaMatches();
      }
    } else {
      matchesToSync = getSampleBarcaMatches();
    }

    if (!matchesToSync || matchesToSync.length === 0) {
      return NextResponse.json({ message: 'Cap partit trobat per sincronitzar.' });
    }

    // 3. Upsert a la base de dades
    let insertedCount = 0;
    let updatedCount = 0;

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

      if (existingMatchId) {
        // Actualitzar dades (especialment resultat i estat)
        const { error } = await supabase
          .from('matches')
          .update({
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

        if (!error) updatedCount++;
      } else {
        // Inserir nou partit
        const { error } = await supabase
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
          });

        if (!error) insertedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sincronització completada amb èxit.`,
      stats: {
        totalReceived: matchesToSync.length,
        inserted: insertedCount,
        updated: updatedCount,
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
