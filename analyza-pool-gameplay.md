# Game Design & Psychologická analýza: „TAJNÝ KRUH“ (Skupinový Pool pro 6–30 lidí)

> **Zadání:** Varianta pro větší skupinu (např. 20 lidí na chatě, párty, silvestru, teambuildingu, svatbě nebo dovolené). Někdo do poolu anonymně hodí smyslný návrh, někdo ho anonymně přijme — a **ani jeden netuší, kdo je ten druhý**. Cílem je navrhnout **hravý, smyslný gameplay**, kterým se k sobě postupně propracují, aniž by to bylo „moc snadné“ nebo sociálně trapné.

---

## 1. Psychologie skupiny: Proč „Tinder pro 20 lidí“ nefunguje (a co funguje)

V partě 20 lidí na jednom místě je skoro vždycky skryté erotické napětí, zvědavost a „co kdyby…“. Proč se nic nestane?
1. **Extrémní sociální riziko:** Odmítnutí na chatě nebo na párty neznamená jen zavřít appku — znamená to dívat se na toho člověka u snídaně a riskovat drby.
2. **Strach z „nechtěného matche“:** U anonymního návrhu je největší noční můra: *„Co když návrh přijme někdo, kdo mě vůbec nepřitahuje (nebo můj šéf / kolega / někdo zadaný)?“*
3. **Když je to moc rychlé, zmizí kouzlo:** Kdyby se po kliknutí hned ukázala jména, působí to lacině a lidi zpanikaří.

**Zlaté pravidlo designu Tajného Kruhu:**
> **Napětí musí stoupat pomalu jako v dobré hře (Mafie × Eyes Wide Shut), identita se nesmí odhalit předčasně, a OBĚ strany musí mít v každém kroku bezpečné „Spálit masku“ bez ztrapnění — zejména ve chvíli, kdy v místnosti poprvé zjistí, kdo je na druhé straně!**

---

## 2. Kompletní Gameplay: 5 fází „Hry o Masku“

Celá hra je navržená **mobile-first** přes jeden skupinový WhatsApp link a automaticky **shoří za 12 hodin** (ráno po párty neexistuje žádný záznam).

### Fáze 0: Vstup do Tajného Kruhu (15 sekund přes WhatsApp)
1. Jeden člověk založí **Tajný Kruh** (např. `KRUH-8X2`) a hodí **1 link do skupinového WhatsAppu**.
2. Každý na mobilu zadá jen 3 věci (žádné jméno, žádný e-mail!):
   - **Přidělená Maska:** např. *Rudý Fénix*, *Černý Havran*, *Sametová Liška*, *Zlatý Had*.
   - **Tichý filtr kompatibility:** *Jsem (Muž / Žena / Jiné)* + *Lákají mě (Ženy / Muži / Kdokoliv)*. Backend nikdy nepropojí nekompatibilní preference!
   - **3 tajné indicie o sobě (zamčené v trezoru):**
     - *Indicie 1 (široká):* např. barva oblečení nebo nápoj, co držíš v ruce.
     - *Indicie 2 (bližší):* např. „Známe se méně než 3 roky“ / „Mám skryté tetování“.
     - *Indicie 3:* generuje až AI pro hru v místnosti!
3. **Anti-spam mechanika („3 Zlaté sirky“):** Každý hráč má na celý večer jen **3 Zlaté sirky** (= max. 3× může chytit cizí návrh v poolu). Díky tomu nikdo bezhlavě nekliká na všechno a každé chycení jiskry má skutečnou váhu!

---

### Fáze 1: „Pool Jisker“ — Anonymní vhození návrhu
Všech 20 lidí vidí na mobilu společný **Pool Jisker** + **Teploměr místnosti** (*„V místnosti právě hoří 6 jisker • 2 tajné komnaty jsou aktivní“* -> okamžité vzrušení a FOMO v celé místnosti!).

Kdokoliv může anonymně vhodit **Hříšný návrh** (vlastní text nebo z připravených karet), např.:
- *„Někdo v téhle místnosti má pohled, ze kterého mám husí kůži. Chceš na 15 minut zmizet na terasu?“*
- *„Mám chuť na zakázaný polibek ještě před druhou ráno — bez drbů zítra u snídaně.“*
- *„Hledám partnera na dnešní noc. Podmínka: umíš držet tajemství a baví tě pomalá hra.“*

**Jak se řeší „Cold Start“ (když se všichni na začátku stydí vhodit první návrh):**
- AI Zpovědník po 10 minutách sám hodí do poolu **Systémovou jiskru** (*„Zpovědník se ptá: Kdo by se v téhle místnosti dnes nechal svést? Klikni tajně — když kliknou alespoň 2 kompatibilní masky, otevřu jim tajnou komnatu!“*). Nikdo nemusí být ten „první odvážný“!

**Chycení návrhu:**
- Kdokoliv kompatibilní klikne **„Chytám jiskru 🔥“** (spotřebuje 1 Zlatou sirku) a připojí jedinou tajnou větu (*„Proč zrovna já?“* nebo výběr ze 3 vtipných karet).
- Pokud návrh chytí více lidí (např. 3 masky), autor návrhu vidí jen jejich **Masky + tu jednu větu** a vybere **jednu Masku**, se kterou vstoupí do **Tajné komnaty**. (Ostatním se sirka vrátí!).

---

### Fáze 2: „Zkouška chemie“ (Maska × Maska — 2 minuty)
Obě Masky (např. *Rudý Fénix* × *Černý Havran*) vstoupí do soukromé šifrované komnaty. **Stále nikdo neví, kdo je kdo!**

AI Zpovědník jim naráz naservíruje **3 rychlé naslepo zodpovídané otázky** (odpovědi se ukážou až ve chvíli, kdy odpoví oba, aby nikdo neopisoval):
1. **Záměr večera (kalibrace hranic):** *„Jak daleko chceš dnes zajít?“* (Flirt & napětí / Polibek v soukromí / Zmizet spolu na celou noc).
2. **Dynamika:** *„Vést, nechat se vést, nebo se přetahovat o kontrolu?“*
3. **Jiskra šarmu (1 otevřená věta):** *„Co je první věc, kterou mi pošeptáš, až poznáš, kdo jsem?“*

**Odměna za projití Zkoušky 1:**
- Odemkne se **Indicie č. 1** obou hráčů (zúží okruh v místnosti z 20 lidí třeba na 6–8, ale pořád to není jisté!).
- **Brána souhlasu #1:** Oba tajně kliknou **„Chci jít dál 🔥“** nebo **„Spálit masku 💨“**.
  - Pokud alespoň jeden dá *Spálit*, komnata okamžitě zmizí s neutrální hláškou *„Maska se rozplynula v kouři“* (žádné uražené ego, nulová stopa).

---

### Fáze 3: „Hra na signál v místnosti“ — KILLER GAMEPLAY MECHANIKA!!
Tady přestává jít jen o psaní do mobilu a hra se přenáší **přímo do reálné místnosti mezi všech 20 lidí**!

Tohle je klíčový moment, který řeší **vzrušení + bezpečnost před ztrapněním** jedním geniálním tahem — **dvoufázovým asymetrickým signálem**:

#### Krok 3A: První signál (Lovec pozoruje, Maska vysílá)
- AI Zpovědník dá *Fénixovi* (autorovi návrhu) tajný, nenápadný fyzický signál do reálného prostoru:
  > **„Během příštích 2 minut se napij, na 3 vteřiny si prsty sáhni na šíji/krk a pomalu se rozhlédni po místnosti. Pak klikni ‚Signál vyslán‘.“**
- *Havranovi* (tomu, kdo návrh přijal) se na mobilu objeví:
  > **„Sleduj místnost! Tvoje druhá Maska si v příštích 2 minutách sáhne na krk a rozhlédne se. Zjistíš, kdo to je — a tvoje identita přitom ZŮSTÁVÁ SKRYTÁ.“**

**Proč je tohle psychologická bomba:**
- *Havran* sleduje 20 lidí v místnosti s bušícím srdcem… a najednou vidí, kdo udělal tajné gesto!
- **Bezpečná úniková brzda (Safe Eject):**
  - Pokud *Havran* zjistí, že je to někdo, kdo ho **nepřitahuje**, jednoduše stiskne **„Spálit masku 💨“**. *Fénix* se **NIKDY nedozví, kdo byl Havran**, nikdo se neztrapní, zítra ráno úplná pohoda!
  - Pokud *Havranovi* při pohledu na *Fénixe* poskočí srdce -> klikne **„HOŘÍM — POSÍLÁM SIGNÁL ZPĚT 🔥“**!

#### Krok 3B: Druhý signál (Role se otočí!)
- Teď dostane tajné gesto *Havran* (např.: *„Zvedni se jako že jdeš pro pití / na toaletu, nebo si prohrábni vlasy a usměj se do prostoru“*).
- *Fénix* teď sleduje místnost a zjistí, kdo je *Havran*!
- A úplně stejně svobodně a bezpečně rozhodne: **„CHCI SETKÁNÍ 🔥“** nebo **„Spálit masku 💨“**!

*(Pro extra hravost v režimu „Detektiv“ může AI v Kroku 3A náhodně poslat nevinný mini-úkol typu „Napij se!“ i 1 dalšímu hráči v poolu jako falešnou návnadu, aby bylo hledání ještě napínavější!)*

---

### Fáze 4: „Tajné heslo & Rendezvous“ (Finální odemčení)
Jakmile **OBA** v místnosti navzájem poznali signál toho druhého a **OBA** potvrdili **„CHCI SETKÁNÍ 🔥“**, nastane nejsilnější moment hry — oba už vědí, že se navzájem chtějí, a adrenalin je na 100 %!

AI Zpovědník jim na obou mobilech synchronně odemkne **Finální kartu Rendezvous**:
1. **Tajné heslo pro první slovo** (odbourá trapné „tak čau“): např. *„Máš pro mě ten odpustek?“* / odpověď: *„Jen když slíbíš, že nic neřekneš.“*
2. **Výběr místa & času (1 klik):** *Za 5 minut na terase / Na chodbě u schodiště / U baru / Za 10 minut venku na vzduchu*.
3. **První micro-úkol (30s icebreaker):** *„Žádné mluvení o práci ani o ostatních v místnosti. Prvních 10 sekund jen tichý pohled do očí a pak ať vede ten, kdo hodil jiskru.“*
4. **Automatické spálení:** Za 20 minut (nebo jedním podržením) celá komnata shoří ze SQL Serveru — žádná historie, žádné důkazy.

---

## 3. Volitelné herní módy pro různé typy skupin

Aby si Tajný Kruh mohla zahrát jak „slušnější“ parta kamarádů, tak odvážná párty:

| Herní mód Kruhu | Úroveň žáru | Pro koho |
| :--- | :--- | :--- |
| **1. Flirt & Napětí (Lehký)** | 🔥 | Oslavy, svatby, teambuilding — tajné komplimenty, polibky, zmizení na sklenku, hravé úkoly. |
| **2. Noční Klášter (Pikantní — výchozí)** | 🔥🔥 | Chaty, silvestr, párty s partou — svádění, tajné návrhy na noc, fyzické signály, odvážnější rendezvous. |
| **3. Bez masek po půlnoci (Odvážný 18+)** | 🔥🔥🔥 | Otevřené / sex-positive párty — přímější erotické návrhy, volba dynamiky, možnost i návrhů pro 2+ lidí. |

---

## 4. Řešení 5 největších rizik (Aby to v realitě fungovalo bez průšvihu)

1. **Co když někdo zneužije anonymitu k vulgaritě nebo obtěžování?**
   - Tvrdý guardrail (`SafetyGuardrailService`) + tlačítko **„Nahlásit / Spálit“** v poolu (3 nahlášení smažou návrh i možnost daného hráče psát do poolu).
2. **Co když jeden „lovec“ chytne všechny návrhy v místnosti?**
   - Mechanika **3 Zlatých sirek** + cooldown 5 minut + v jeden moment může mít každý otevřenou **maximálně 1 aktivní Tajnou komnatu**!
3. **Co když v Kruhu 20 lidí nikdo nechce začít jako první?**
   - Tlačítko **„Hoď náhodnou jiskru za mě“** + automatická **Systémová jiskra od Zpovědníka**, ke které se lidé jen tajně připojují.
4. **Co když zadaní lidé chtějí hrát jen ze srandy, ale nechtějí reálně podvádět?**
   - Při vstupu lze zapnout štítek **„Jen slovní hra / Nevinný flirt“** (nebo rovnou v Kruhu filtrovat záměr v Zkoušce 1). Navíc u párů na stejné párty lze zapnout mód *„Pár hraje spolu“*!
5. **Co když si někdo na mobilu vyfotí screenshot?**
   - V Tajné komnatě se **nikdy nepíšou reálná jména** — ani na konci! Identitu odhalí výhradně **fyzický signál v reálné místnosti**. Screenshot z mobilu tak ukazuje jen *Rudý Fénix × Černý Havran* — nulový kompromitující důkaz! *(Tohle je geniální designová pojistka!)*

---

## 5. Jak by to vypadalo technicky na našem stacku (.NET 10 + MSSQL + React)

Architektonicky to perfektně sedne přímo do našeho stávajícího projektu **ODPUSTEK**:
- **Nové tabulky v MSSQL:**
  - `GroupPools` (`PoolCode`, `Title`, `HeatMode`, `CreatedAt`, `ExpiresAt` — auto-cleanup po 12 h)
  - `PoolMembers` (`Id`, `PoolCode`, `ClientId`, `MaskName`, `MaskSymbol`, `Gender`, `Seeking`, `Clue1`, `MatchesLeft = 3`)
  - `PoolSparks` (`Id`, `PoolCode`, `AuthorMemberId`, `Text`, `IntentLevel`, `Status: Open | Matched | Burned`)
  - `PoolSparkCatches` (`Id`, `SparkId`, `CatcherMemberId`, `PitchText`)
  - `MaskChambers` (`Id`, `PoolCode`, `SparkId`, `MemberAId`, `MemberBId`, `Stage: 1..4`, `AnswersAJson`, `AnswersBJson`, `SignalA`, `SignalB`, `SignalASent`, `SignalBSent`, `ConsentA`, `ConsentB`, `RendezvousCode`, `MeetingSpot`)
- **Real-time zážitek na mobilech:**
  - Polling každé 3 s (nebo SignalR v `.NET 10`, který je built-in!) pro okamžitý *Teploměr místnosti*, nové jiskry v poolu a živé signály v místnosti!
- **1-klik WhatsApp pozvánka pro celou skupinu:**
  - `https://app-zpovednice-dev.azurewebsites.net/?pool=KRUH-8X2` -> jeden link do skupinového chatu a všech 20 lidí je do 30 sekund uvnitř!

---

## 6. Shrnutí: Proč tohle může být absolutní virální hit

- **Originální gameplay, který nikde jinde není:** Spojení anonymního poolu návrhů + 3-kolového ověření chemie + **asymetrického fyzického signálu v reálné místnosti** řeší *všechny* psychologické bariéry najednou (napětí, hravost, nulové ztrapnění, žádný digitální důkaz ráno).
- **20× rychlejší organické šíření:** Každá chata, silvestr nebo párty přivede 15–30 nových uživatelů jedním WhatsApp linkem.
- **Krásně doplňuje Párovou zpovědnici:**
  - *Jste doma ve dvou?* -> **Párová zpovědnice**
  - *Jste na chatě / párty ve 20 lidech?* -> **Tajný Kruh (Pool)**
  - *Jsi sám/sama se svými myšlenkami?* -> **Solo Zpovědnice & Atlas touhy**
