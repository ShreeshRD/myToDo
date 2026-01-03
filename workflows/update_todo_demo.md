---
description: Update the todo_demo project with the latest frontend from frontend-next
---
This workflow details how to update the `todo_demo` directory using the `frontend-next` source while preserving specific configurations and features essential for the demo environment.

### Steps

1. **Backup Demo-Specific Files**
   Before overwriting, ensure you have copies or references of:
   - `todo_demo/components/WarningBanner.js`
   - `todo_demo/package.json` (specifically the `homepage`, `gh-pages` dependency, and `deploy` scripts)
   - `todo_demo/app/layout.tsx` (to see where `WarningBanner` is integrated)

2. **Sync Frontend Source**
   Update the `todo_demo` directory with the contents of `frontend-next`:
   - Sync the contents of `frontend-next` to `todo_demo`, excluding `node_modules`, `.next`, `out`, and `.swc`.
   - Use a command like:
     ```bash
     rsync -av --exclude='node_modules' --exclude='.next' --exclude='out' --exclude='.swc' frontend-next/ todo_demo/
     ```

3. **Restore Demo Features**
   Ensure the following are correctly integrated in the updated `todo_demo`:
   - **Warning Banner**: 
     - Re-add `components/WarningBanner.js` if it was deleted.
     - Update `todo_demo/app/layout.tsx` to import and include `<WarningBanner />` within the `Providers` or appropriate wrapper, similar to how it was before.
   - **Package Configuration**:
     - Compare `todo_demo/package.json` with `frontend-next/package.json`.
     - Manually add only new dependencies from `frontend-next` to `todo_demo/package.json` (both `dependencies` and `devDependencies`).
     - Preserve existing demo-specific configurations:
       - `homepage` field: `"homepage": "https://ShreeshRD.github.io/myToDo"`.
       - `gh-pages` in `devDependencies`.
       - `deploy` and `predeploy` scripts:
         ```json
         "predeploy": "npm run build",
         "deploy": "echo \"\" > out/.nojekyll && gh-pages -d out --dotfiles -r https://github.com/ShreeshRD/myToDo.git"
         ```
   - **Mock Data**:
     - After syncing, verify that `service.js` in `todo_demo` has been updated with the latest mock data configuration from `frontend-next`.
     - Ensure the mock data connection is properly configured for the demo environment.

4. **Verify and Fix**
   - Run `npm install` in `todo_demo` to update dependencies.
   - Run linting: `npm run lint`.
   - Run tests: `npm run test`.
   - Fix any errors or linting issues that arise from the merge.

5. **Deploy (Optional)**
   - Run `npm run deploy` to verify the deployment pipeline works as expected.