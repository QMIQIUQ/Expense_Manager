# 文档清理脚本
# 运行此脚本删除旧的冗余文档

$docsPath = "c:\個人文件\Project\Expense_Manager\docs"

# 要保留的新整合文档
$keepFiles = @(
    "README.md",
    "FEATURES.md",
    "ARCHITECTURE.md",
    "UI_STYLE_GUIDE.md",
    "DARK_MODE_GUIDE.md",
    "DEVELOPMENT_GUIDE.md",
    "ADMIN_GUIDE.md",
    "PAYMENT_METHODS_GUIDE.md",
    "BUDGET_GUIDE.md",
    "INCOME_REPAYMENT_GUIDE.md",
    "IMPORT_EXPORT_GUIDE.md",
    "FIREBASE_SETUP.md",
    "TESTING_GUIDE.md",
    "CHANGELOG.md"
)

# 获取所有 md 文件
$allFiles = Get-ChildItem -Path $docsPath -Filter "*.md"

# 删除不在保留列表中的文件
$deleted = 0
foreach ($file in $allFiles) {
    if ($keepFiles -notcontains $file.Name) {
        Write-Host "删除: $($file.Name)" -ForegroundColor Yellow
        Remove-Item $file.FullName -Force
        $deleted++
    } else {
        Write-Host "保留: $($file.Name)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "完成! 删除了 $deleted 个文件, 保留了 $($keepFiles.Count) 个文件" -ForegroundColor Cyan
