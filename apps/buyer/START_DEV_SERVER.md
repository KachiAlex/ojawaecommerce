# 🚀 Starting the Development Server

## Quick Start (PowerShell - Windows)

Since you're on Windows with PowerShell, use these commands:

### Option 1: Separate Commands
```powershell
cd apps/buyer
npm run dev
```

### Option 2: Single Line (PowerShell)
```powershell
cd apps/buyer; npm run dev
```

### Option 3: Using NPM from root
```powershell
cd apps\buyer
npm run dev
```

---

## Step-by-Step

1. **Open a new PowerShell terminal**
   - Press `Win + X` → Choose "Terminal" or "PowerShell"

2. **Navigate to the project:**
   ```powershell
   cd C:\ojawa-firebase\apps\buyer
   ```

3. **Start the server:**
   ```powershell
   npm run dev
   ```

4. **Wait for it to start** (usually 10-30 seconds)
   You should see:
   ```
   VITE v4.x.x  ready in xxx ms

   ➜  Local:   http://localhost:5173/
   ➜  Network: use --host to expose
   ➜  press h to show help
   ```

5. **Open your browser:**
   ```
   http://localhost:5173/test-autocomplete
   ```

---

## Troubleshooting

### Port Already in Use

If you get an error like "Port 5173 is already in use":

**Solution 1: Kill the process**
```powershell
# Find what's using port 5173
netstat -ano | findstr :5173

# Kill the process (replace PID with the number from above)
taskkill /PID <PID> /F

# Then try npm run dev again
npm run dev
```

**Solution 2: Use a different port**
```powershell
npm run dev -- --port 3000
```
Then access: `http://localhost:3000/test-autocomplete`

### Permission Errors

If you get permission errors:

```powershell
# Run as administrator
# Right-click PowerShell → Run as Administrator
cd C:\ojawa-firebase\apps\buyer
npm run dev
```

### Node Modules Missing

If you get errors about missing modules:

```powershell
cd C:\ojawa-firebase\apps\buyer
npm install
npm run dev
```

---

## Verify It's Running

Once the server starts, you should see in the terminal:

```
✅ VITE ready in XXX ms
✅ Local: http://localhost:5173/
```

Then you can access:
- **Test Page**: http://localhost:5173/test-autocomplete
- **Cart Page**: http://localhost:5173/cart
- **Home**: http://localhost:5173/

---

## Alternative: Use VS Code Terminal

If you have VS Code:

1. Open VS Code in the project folder
2. Press `` Ctrl + ` `` to open terminal
3. Run:
   ```powershell
   cd apps\buyer
   npm run dev
   ```

---

## Still Not Working?

Check if Node.js is installed:

```powershell
node --version
npm --version
```

Should show versions like:
```
v18.x.x (or higher)
9.x.x (or higher)
```

If not installed, download from: https://nodejs.org/

