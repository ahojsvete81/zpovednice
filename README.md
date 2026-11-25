# ODPUSTEK — Online Zpovědnice Hříchů (MVP)

Moderní smyslná 18+ webová aplikace na stacku **.NET 10 + EF Core 10 (MSSQL) + React + TypeScript + Tailwind CSS**.

## Hlavní funkce MVP
- **Solo Zpovědnice:** 4 unikátní persony AI Zpovědníků (*Otec Dominik*, *Matka představená*, *Mefisto*, *Sestra Klára*), nastavení intenzity, šeptaný hlasový náhled (Web Speech API), generátor smyslného **Pokání** a rituál **Spálení zpovědi** (tvrdé smazání záznamu z SQL Serveru).
- **Párová zpovědnice (Blind Desire Matching):** Partneři zadají tajné fantazie a hranice (na dvou telefonech přes kód `SIN-XXXX` nebo přepínačem na jednom zařízení) -> AI najde společnou jiskru bez prozrazení jednostranných tajemství a vygeneruje 3-fázový **Večer rozhřešení**. Surové zpovědi se okamžitě mažou.
- **Zeď hříchů:** Anonymní komunita uložená v MSSQL s hlasováním **„Odpustit“ vs. „Do pekla“**.
- **Monetizace („Odpustky“ & VIP):** Peněženka kreditů a transakce uložené v SQL Serveru (`Wallets`, `CreditTransactions`) s demo Stripe aktivací.
- **Bezpečnost & Soukromí:** 18+ vstupní brána, **Diskrétní režim (Panic Button — klávesa `Esc`)**, bezpečnostní krizový guardrail s českými linkami pomoci (`SafetyGuardrailService`).

## Databáze (MSSQL localhost)
Výchozí connection string v `backend/appsettings.json`:
```text
Server=localhost;Database=ZpovedniceDb;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true
```
Databáze `ZpovedniceDb` a všechny tabulky (`Wallets`, `ConfessionSessions`, `CoupleRooms`, `SinWallEntries`, `CreditTransactions`) se při prvním spuštění automaticky vytvoří a naplní úvodními daty.

## Připojení živého AI modelu (volitelné)
Bez API klíče běží bohatý vestavěný **Crafted Czech Demo Engine**. Pro živé LLM odpovědi nastav v `backend/appsettings.json` (nebo přes proměnnou prostředí `OPENAI_API_KEY` / `AI_CONFESSOR_API_KEY`):
```json
"AiConfessor": {
  "BaseUrl": "https://api.openai.com/v1",
  "Model": "gpt-4o-mini",
  "ApiKey": "TVUJ_KLIC"
}
```
Podporuje jakékoliv OpenAI-kompatibilní API (OpenAI, OpenRouter, Mistral, Groq, lokální Ollama).

## Spuštění lokálně

### 1. Backend (.NET 10 API na portu 5150)
```powershell
cd backend
dotnet run
```

### 2. Frontend (React + TypeScript + Vite na portu 5173)
```powershell
cd frontend
npm run dev
```
Otevři [http://localhost:5173](http://localhost:5173).

## Nasazení na Azure (Testovací prostředí)
- **Live URL:** https://app-zpovednice-dev.azurewebsites.net
- **Resource Group:** `rg-zpovednice` (`polandcentral`)
- **App Service:** `app-zpovednice-dev` (Linux, `.NET 10`, hostuje API i React SPA ze složky `wwwroot`)
- **Azure SQL Database:** `sql-zpovednice-dev-jb.database.windows.net` / `ZpovedniceDb`

Opakované nasazení po změnách v kódu jedním příkazem:
```powershell
.\deploy-azure.ps1
```
