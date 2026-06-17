# Project Vault CRM - Local VS Code Setup Guide

This guide details setting up the **MERN + Supabase Project Vault CRM** on your local machine using VS Code.

---

## 🛠️ Step 1: Initialize Project Directory

Open your local terminal and execute the following commands to create your workspace directories:

```bash
# Create root workspace
mkdir project-vault-crm && cd project-vault-crm

# Create backend directory
mkdir backend && mkdir backend/utils

# Create frontend directory
mkdir frontend
```

---

## 💾 Step 2: Supabase Database Setup

1. Sign in to your [Supabase Console](https://supabase.com).
2. Click **New Project** and configure your database location.
3. Once the database is provisioned, go to the **SQL Editor** tab from the left navigation panel.
4. Click **New Query**, copy the contents of the `database/schema.sql` file, paste it into the editor, and click **Run**.
5. Copy the contents of the `database/rls_policies.sql` file, paste it into a new query tab, and click **Run** to set up security layers.

---

## 🔌 Step 3: Configure Express Backend Server

1. Open VS Code and navigate to the `backend/` directory.
2. Create `package.json`, paste the contents from `backend/package.json` into it, and install dependencies:
   ```bash
   cd backend
   npm install
   ```
3. Create a `.env` file in the root of your `backend/` directory. Use the credentials found in your Supabase project settings (**Settings -> API**):
   * **SUPABASE_URL**: Paste your project's URL here.
   * **SUPABASE_SERVICE_ROLE_KEY**: Copy and paste the service role token (this allows the API server to perform mutations).
   * **VAULT_ENCRYPTION_SECRET**: Create a secure 32-character encryption key (used to encrypt passwords with AES-256).
4. Create the files `backend/utils/crypto.js` and `backend/server.js` and paste their respective codes.
5. Start your local Express development server:
   ```bash
   npm run dev
   ```
   *Your backend is now running at `http://localhost:5000`.*

---

## 💻 Step 4: Configure React Frontend Client

1. Navigate to the `frontend/` directory:
   ```bash
   cd ../frontend
   ```
2. Initialize a standard Vite-React template using npm:
   ```bash
   # Initialize Vite template
   npm create vite@latest . -- --template react
   
   # Install project packages
   npm install
   
   # Install auxiliary dependencies
   npm install axios lucide-react tailwindcss postcss autoprefixer
   ```
3. Copy the entry configuration files to your workspace directories:
   * **`frontend/index.html`** (Put directly in the `frontend/` folder root)
   * **`frontend/vite.config.js`** (Put directly in the `frontend/` folder root)
   * **`frontend/src/main.jsx`** (Put in the `frontend/src/` directory)
   * **`frontend/src/index.css`** (Put in the `frontend/src/` directory)
   * **`frontend/src/App.jsx`** (Put in the `frontend/src/` directory)
   * **`frontend/src/api.js`** (Put in the `frontend/src/` directory)
4. Initialize Tailwind CSS configuration:
   ```bash
   npx tailwindcss init -p
   ```
5. Replace standard contents of `frontend/tailwind.config.js` with the Custom Theme code provided in the file tree.
6. Launch your local React client workspace:
   ```bash
   npm run dev
   ```
   *The React web client will boot up successfully and run smoothly at `http://localhost:5173`.*

---

## 🚀 Step 5: Test & Verify Setup

1. Open your browser and navigate to `http://localhost:5173`.
2. Try adding a new project or credential.
3. Open your Supabase Console table editor to verify that projects are being written to PostgreSQL and that the stored credentials are encrypted with AES-256!
