# Picknick-Grill – Online-Bestellsystem

Eine schlanke Bestell-Website für den Picknick-Grill in Marienheide:
Kunden stellen sich online ihr Essen zusammen und bestellen zur Abholung.
Der Inhaber sieht neue Bestellungen im Admin-Bereich, bestätigt sie und
gibt eine Abholzeit vor – der Kunde sieht diese dann live auf seiner
Status-Seite ("Du kannst dein Essen um 18:30 Uhr abholen").

## Funktionen

- **Speisekarte** (`/`) – alle Gerichte aus der aktuellen Karte, nach Kategorien
  sortiert, mit Warenkorb und Bestellformular (Name, Telefonnummer,
  Wunsch-Abholzeit, Anmerkung).
- **Bestellstatus** (`/status.html`) – Kunden geben Bestellnummer + Code ein
  und sehen live: *"wartet auf Bestätigung"* → *"bestätigt, Abholung um
  HH:MM Uhr"* → *"fertig, bitte abholen"* → *"abgeholt"*. Die Seite aktualisiert
  sich automatisch alle paar Sekunden, solange die Bestellung offen ist.
- **Admin-Bereich** (`/admin`) – passwortgeschützt. Zeigt alle offenen
  Bestellungen mit Artikeln, Namen und Telefonnummer. Der Inhaber trägt eine
  Abholzeit ein und bestätigt die Bestellung, meldet sie später als "fertig"
  oder "abgeholt", oder storniert sie.

Bezahlt wird bar oder mit EC-Karte bei Abholung vor Ort – es ist keine
Online-Zahlung eingebaut.

## Lokal starten

```bash
npm install
cp .env.example .env
# .env öffnen und ADMIN_PASSWORD + SESSION_SECRET setzen
npm start
```

Danach:
- Speisekarte: http://localhost:3000
- Admin-Bereich: http://localhost:3000/admin/login.html

## Die Speisekarte anpassen

Alle Gerichte und Preise stehen in [`data/menu.json`](data/menu.json).
Einfach Einträge ändern, hinzufügen oder löschen – die Website übernimmt
das automatisch. Preise werden serverseitig aus dieser Datei berechnet,
Kunden können also keine falschen Preise übermitteln.

## Bestellungen (Daten)

Bestellungen werden in `data/orders.json` gespeichert (wird beim ersten
Start automatisch angelegt, ist nicht Teil von Git). Für den Betrieb auf
einem Server reicht das für ein Imbiss-Bestellaufkommen problemlos aus.

## Deployment (online stellen)

Der Server ist ein normales Node.js/Express-Programm und läuft auf jedem
Anbieter, der Node.js unterstützt (z. B. Render, Railway, ein eigener
vServer). Wichtig für den Live-Betrieb:

1. `ADMIN_PASSWORD` und `SESSION_SECRET` als Umgebungsvariablen setzen
   (nicht die Beispielwerte verwenden).
2. `npm install` und `npm start` als Start-Befehl hinterlegen.
3. Eine eigene Domain (oder Subdomain) auf den Dienst zeigen lassen.
4. Optional: HTTPS aktivieren (die meisten Hosting-Anbieter machen das
   automatisch).

## Mögliche Erweiterungen (nicht enthalten)

- SMS/WhatsApp-Benachrichtigung an den Kunden, sobald die Bestellung
  bestätigt ist (aktuell muss der Kunde die Status-Seite offen halten oder
  später erneut aufrufen).
- Online-Bezahlung.
- Mehrere Mitarbeiter-Logins im Admin-Bereich.
