# San Antonio High School — Inventory Management System

A responsive, light/minimal inventory dashboard inspired by option 2. Built with HTML, CSS, vanilla JavaScript, Chart.js, and Supabase (Postgres + Auth). It can be deployed as a static site on Vercel.

## Features

- Email/password sign-in through Supabase Auth
- Role-based access: `admin`, `staff`, and `requester`
- Dashboard metrics, stock condition chart, category breakdown, recent movements
- Inventory create, read, update, delete, search, and filtering
- Atomic stock-in / stock-out transactions; stock cannot go negative
- School supply requests and staff review workflow
- Inventory CSV export
- Responsive desktop and mobile layout

## 1. Create the Supabase backend

1. Create a project at [Supabase](https://supabase.com/).
2. Open **SQL Editor** and run all contents of `supabase-schema.sql`.
3. Open **Project Settings → API** (or **Data API**) and copy:
   - Project URL
   - Publishable/anon public key
4. Open **Authentication → Users** and create the first staff account.
5. In SQL Editor, promote that account to administrator:
   ```sql
   update public.profiles
   set role = 'admin', full_name = 'Inventory Administrator'
   where id = 'PASTE_AUTH_USER_UUID_HERE';
   ```
6. Create additional user accounts in **Authentication → Users**. New accounts default to `requester`. Promote trusted inventory operators to `staff` or `admin` using the same SQL update.

Do not put a Supabase `service_role` key in frontend code. Only the publishable/anon key belongs in this static frontend; database access is restricted by Row Level Security (RLS).

## 2. Connect the frontend

Open `app.js` and replace:

```js
const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
```

with your project's URL and publishable/anon key.

## 3. Run locally

You can open `index.html` using a local static server. For example, with Python installed:

```bash
python -m http.server 5500
```

Then visit `http://localhost:5500`.

## 4. Deploy to Vercel

1. Create a GitHub repository and upload `index.html`, `styles.css`, `app.js`, and `supabase-schema.sql` (README can also be included).
2. In Vercel, choose **Add New → Project** and import the repository.
3. Framework preset: **Other**. Build command: leave blank. Output directory: `.`.
4. Deploy. No server-side environment variables are needed for this static version because the public Supabase URL and anon key are configured in `app.js`.
5. In Supabase **Authentication → URL Configuration**, add your deployed Vercel URL to **Site URL** and **Redirect URLs**.

## Role permissions

| Capability | Admin | Staff | Requester |
|---|---:|---:|---:|
| View inventory | Yes | Yes | Yes |
| Add/edit/delete items | Yes | Yes | No |
| Record stock movement | Yes | Yes | No |
| View all transactions | Yes | Yes | Yes |
| Submit requests | Yes | Yes | Yes |
| Review requests | Yes | Yes | No |
| View all requests | Yes | Yes | Own only |

## Important implementation notes

- The dashboard values are calculated from database records; there are no fake seed records.
- “Total items” means the number of distinct inventory records. “Units in stock” is the sum of their quantities.
- Low stock means quantity is greater than zero and less than or equal to reorder level. Out of stock means quantity is zero.
- Requests are workflow records. Approving a request does not automatically deduct stock; staff should record a stock-out transaction when the request is physically issued. This preserves an explicit stock audit trail.
- This is a practical starter system, not a certified school ERP. Before production use, review the school's account provisioning, data retention, backup, and administrator policies.
