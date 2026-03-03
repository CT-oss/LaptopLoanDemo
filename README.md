# IT Loan System Web Demo

Static browser demo of the Tkinter IT loan system.

## Files
- `index.html`
- `styles.css`
- `app.js`

## Run locally
Open `index.html` in a browser.

## GitHub Pages deploy
1. Push this folder to your repo.
2. In GitHub, open `Settings` -> `Pages`.
3. Under `Build and deployment`, set:
   - `Source`: `Deploy from a branch`
   - `Branch`: your branch (for example `main`)
   - `Folder`: `/root`
4. Save.
5. Open: `https://<your-username>.github.io/<repo>/laptoptrackertask/it_loan_system/web_demo/`

If you want this demo as the site root (`/.../<repo>/`), copy these 3 files into `/docs` and set folder to `/docs`.

## Notes
- Data is stored in browser `localStorage` (`it-loan-system-web-demo-v1`).
- A fake database auto-loads for first-time visitors.
- Equipment statuses in demo: `available`, `on_loan`, `under_repair`.
- Header actions:
  - `Take Tour`: guided walkthrough of major screens and controls
  - `Reset to Fake Data`: restore the default demo dataset
  - `Random Fake DB`: generate a fresh randomized dataset
  - `Start Empty`: clear everything and test from scratch
- Loans action:
  - `Remind User`: builds an overdue reminder email for the selected loan borrower
  - `Run Reminder Cycle`: applies brief policy reminders automatically:
    - 7 days before due date
    - 1 day before due date
    - Due date day
    - Day-late reminder
    - Weekly overdue reminders
  - If `REMINDER_WEBHOOK_URL` is set in `app.js`, reminders are sent automatically via POST webhook
  - If no webhook is set, cycle reminders are queued/audited and manual `Remind User` opens a prefilled `mailto:` draft
- The app is fully frontend-only, so it works on GitHub Pages.
