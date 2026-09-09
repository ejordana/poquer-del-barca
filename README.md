# 🔴🔵 PoQuer del Barça - Lliga Familiar

Aplicació web lleugera, **clara, moderna i adaptada per a tota la família (especialment pensada per a gent gran)**.
Permet als membres de la família apostar el resultat exacte de cada partit del FC Barcelona abans que comenci, portar el compte automàtic de punts i competir per guanyar la lliga familiar.

Cost: **0 € (100% gratuït, sense targeta de crèdit)** utilitzant la capa gratuïta de **Vercel** i **Supabase**.

---

## 👨‍👩‍👧‍👦 Els 9 Membres de la Família (Accés en 1 Toc)

L'aplicació està preconfigurada per als 9 membres de la família:
1. **Elisenda**
2. **Francesc**
3. **Montserrat**
4. **Marta**
5. **Anna Maria**
6. **Sigfrid**
7. **Anna**
8. **Xavier** *(Admin)*
9. **Elisabet**

### Com funciona per a la família? (Zero complicacions)
1. Quan un membre de la família obre l'enllaç de la web des del seu mòbil, apareixen **9 botons grans** amb els seus noms.
2. La Montserrat només ha de tocar el botó **«Montserrat»**.
3. A partir d'aquest moment, el mòbil la recorda per sempre: en obrir l'app veurà directe *"Hola, Montserrat! 👋"* i el partit del Barça per fer la porra. **Sense correus electrònics, sense enllaços màgics ni contrasenyes que s'oblidin.**
4. Si vol canviar o comparteixen tauleta, a dalt de tot hi ha un botó: *"Canviar"*.

---

## 🏆 Com funciona el joc i el sistema de punts

### Puntuació (`src/lib/scoring.ts`)
| Encert | Punts | Descripció |
| :--- | :---: | :--- |
| **Marcador exacte (Plena!)** | **3 pts** | Encertes exactament els gols (ex: aposta 3-1 i resultat 3-1). |
| **Signe (1X2)** | **1 pt** | Encertes qui guanya o si empaten, però no els gols exactes. |
| **Fallada** | **0 pts** | No encertes ni el signe ni el resultat. |

### Regles
- Es pot canviar la porra tants cops com es vulgui fins al minut d'inici del partit.
- En començar el partit, les porres queden tancades i tothom pot veure què ha apostat la resta de la família.

---

## 🗄️ Configuració a Supabase (2 minuts)

1. Entra a [supabase.com](https://supabase.com) i crea un projecte gratuït (ex: `porres-barca`).
2. Al menú lateral esquerre, ves a **SQL Editor** -> **New query**.
3. Obre el fitxer [`supabase/schema.sql`](file:///c:/Users/ejord/Documents/antigravity/intelligent-mendeleev/supabase/schema.sql), copia tot el contingut i enganxa'l a l'editor de Supabase.
4. Prem **"Run"**. S'inseriran automàticament els 9 usuaris de la família, les taules i el càlcul automàtic de punts.
5. A **Project Settings** -> **API**, copia la **Project URL** i la **anon key**.

---

## 🛡️ Panell d'Administrador (`/admin`)

Per protegir la gestió dels partits i evitar que ningú toqui res sense voler des del mòbil, l'apartat `/admin` té un **PIN de seguretat de 4 xifres**:
- **PIN per defecte**: `1899` (l'any de fundació del Barça).
- Des d'aquí pots:
  - **Introduir o corregir el resultat d'un partit finalitzat**: poses els gols del Barça i del rival i prems el botó verd per resoldre automàticament els punts de tothom.
  - **Sincronitzar partits**: Carregar partits oficials de La Lliga i Champions o partits de prova.
  - **Afegir partits a mà**: Programar qualsevol partit (ex: amistosos o Copa).

---

## 💻 Execució en Local

1. Crea el teu fitxer `.env.local` copiant `.env.example`:
   ```bash
   cp .env.example .env.local
   ```
2. Afegeix la teva URL i Anon Key de Supabase.
3. Inicia el servidor:
   ```bash
   npm run dev
   ```
4. Obre `http://localhost:3000` al navegador.

---

## 🚀 Desplegament Gratuït a Vercel

1. Puja el codi al teu compte de [GitHub](https://github.com).
2. Entra a [vercel.com](https://vercel.com) i importa el repositori amb el pla Hobby (gratuït).
3. Afegeix les variables d'entorn `NEXT_PUBLIC_SUPABASE_URL` i `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Prem **Deploy**. Tindràs l'enllaç llest per enviar al grup de WhatsApp de la família!
