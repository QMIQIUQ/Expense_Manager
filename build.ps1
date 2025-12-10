Push-Location "c:\個人文件\Project\Expense_Manager\web"
Write-Host "Building project..." -ForegroundColor Green
npm run build
Write-Host "Build complete!" -ForegroundColor Green
Pop-Location
