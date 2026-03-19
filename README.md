# 🌍 Circular MVP

## Idee

Viele wiederkehrende Aufgaben (z.B. **Backups machen**, **PC-Filter reinigen**, **Pflanzen giessen**, **Medikament nachbestellen**, **Rechnung bezahlen**, **Passwort ändern**, **Bettwäsche wechseln**, **Müll rausbringen**, **Ölwechsel**, **Service**, **Reifen wechseln**) gehen im Alltag vergessen.
Diese App löst das Problem mit **wiederkehrenden Remindern**: Du erfasst eine Aufgabe einmal, wählst ein **Intervall** (z.B. jährlich) und bekommst ab dem Fälligkeitsdatum eine **Browser-Benachrichtigung (Notification)**, sobald die Aufgabe fällig ist.

## Circular Flow

- **Use Longer**: Wiederkehrende Aufgaben müssen nicht jedes Jahr neu erfasst werden – ein Eintrag lebt weiter.
- **Use Again**: Nach „Erledigt“ plant die App automatisch den **nächsten Termin** im gleichen Intervall.
- **Make Clean**: Die Liste bleibt übersichtlich durch Filter (Alle/Offen/Erledigt) und klare Fälligkeitsanzeige.
- **Use Less**: Weniger Papier-/Notizzettel und weniger manuelles Nachführen – alles lokal im Browser gespeichert.

## Funktionen

1. **Wiederkehrende Reminders erstellen**
   - Titel (Pflicht)
   - Notiz (optional)
   - Intervall: wöchentlich / monatlich / jährlich
   - erstes Fälligkeitsdatum

2. **Benachrichtigungen (Notifications)**
   - Permission-Button („Notifications erlauben“)
   - Bei fälligen Remindern wird eine Browser-Notification angezeigt
   - Hinweis: Notifications funktionieren zuverlässig, wenn die Seite geöffnet ist

3. **Erledigt + nächsten Termin planen**
   - Klick auf „Erledigt“ setzt den Reminder auf den **nächsten** Termin (z.B. +1 Jahr)
   - Löschen ist ebenfalls möglich

## Deployment

Diese App wird über **GitHub Pages** veröffentlicht.

### Lokal starten

```bash
npm install
npm run dev
```

### Build

```bash
npm run build
```
