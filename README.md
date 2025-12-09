# 💰 Expense Monitor

> This is the beginning of my 'Expense Monitor' app journey. Built to help track and manage expenses effortlessly, accessible from anywhere, and optimized for real-time syncing across devices. Powered by modern web technologies and GitHub Copilot!

## 🚀 Features

- **📊 Real-time Expense Tracking** - Add, view, and manage expenses with instant updates
- **📱 Responsive Design** - Works seamlessly on mobile, tablet, and desktop devices
- **🔄 Cross-Device Sync** - Data syncs across browser tabs in real-time using localStorage
- **📴 Offline Support** - Service Worker enables offline functionality
- **🎨 Modern UI** - Beautiful, intuitive interface with smooth animations
- **📈 Smart Dashboard** - View total, monthly, and daily expense summaries
- **🔍 Search & Filter** - Find expenses quickly with search and category filters
- **📑 Multiple Categories** - Organize expenses by Food, Transport, Shopping, Entertainment, Bills, Health, Education, and more
- **📊 Flexible Sorting** - Sort by date or amount (ascending/descending)
- **💾 Local Storage** - All data stored securely in your browser

## 🛠️ Technologies Used

- **HTML5** - Semantic markup for structure
- **CSS3** - Modern styling with flexbox, grid, and animations
- **Vanilla JavaScript** - No framework dependencies, pure ES6+
- **Service Workers** - For offline capability and caching
- **LocalStorage API** - Client-side data persistence
- **Progressive Web App (PWA)** - Installable on devices with manifest.json

## 🎯 Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- No additional installations required!

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/QMIQIUQ/Expense_Manager.git
   cd Expense_Manager
   ```

2. Open `index.html` in your web browser:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Or using Node.js
   npx http-server
   
   # Or simply open the file
   open index.html
   ```

3. Start tracking your expenses! 🎉

## 📖 Usage

### Adding an Expense

1. Fill in the expense description (e.g., "Grocery shopping")
2. Enter the amount in dollars
3. Select a category from the dropdown
4. Choose the date (defaults to today)
5. Click "Add Expense"

### Managing Expenses

- **Search**: Type in the search box to filter expenses by description
- **Filter by Category**: Use the category dropdown to view specific categories
- **Sort**: Choose sorting order (newest first, oldest first, highest amount, lowest amount)
- **Delete**: Click the "Delete" button on any expense to remove it

### Viewing Statistics

The dashboard shows three key metrics:
- **Total Expenses**: Sum of all recorded expenses
- **This Month**: Total expenses for the current month
- **Today**: Expenses recorded today

## 🌐 Browser Support

- ✅ Chrome (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## 🔒 Privacy & Security

- All data is stored locally in your browser
- No data is sent to external servers
- Your expense information stays on your device
- XSS protection with HTML escaping

## ✨ React Web App (NEW!)

A comprehensive React-based expense manager with Firebase integration is now available in the `/web` directory!

### Features
- ✅ Full expense CRUD operations with Firebase Firestore
- ✅ Custom categories with icon and color customization
- ✅ Budget tracking with visual progress indicators
- ✅ Dashboard analytics with summary cards
- ✅ Recurring expense management
- ✅ Excel/CSV import/export functionality
- ✅ Multi-device sync via Firebase
- ✅ User authentication (Email/Password, Google)
- ✅ **Progressive Web App (PWA)** - Installable on any device with offline support 🆕

**[See web/README.md for setup instructions →](web/README.md)**

**[See FEATURES.md for detailed feature documentation →](FEATURES.md)**

**[See IMPLEMENTATION_SUMMARY.md for implementation details →](IMPLEMENTATION_SUMMARY.md)**

**[See ARCHITECTURE.md for system architecture →](ARCHITECTURE.md)**

**[See IMPORT_EXPORT_GUIDE.md for import/export feature guide →](IMPORT_EXPORT_GUIDE.md)**

**[See agent-priority-rules.md for development guidelines (for agents and developers) →](agent-priority-rules.md)**

**[See DATE_HANDLING_REFACTORING.md for date/time utility documentation →](docs/DATE_HANDLING_REFACTORING.md)**

**[See docs/PWA_GUIDE.md for Progressive Web App installation and features →](docs/PWA_GUIDE.md)**

## 🚧 Future Enhancements

- [x] Backend API integration for cloud sync ✅
- [x] User authentication and accounts ✅
- [x] Import/Export to Excel/CSV ✅
- [x] Budget setting and alerts ✅
- [x] Recurring expense tracking ✅
- [x] Progressive Web App (PWA) with offline support ✅
- [ ] Data visualization with charts (partially complete)
- [ ] Receipt photo attachments with OCR
- [ ] Multi-currency support
- [ ] Dark mode toggle
- [ ] PDF export


## 🆕 Recent Changes
- Added Bank option to payment methods (Cards / Banks / E-Wallets) and fixed missing banks prop in CardForm.
- Optimized initial load: cached offline data shown first, background sync minimizes dashboard stutter.
- Fixed expense date revert issue with optimistic cache updates (see OFFLINE_SYNC_FIX.md).
- UI: Numeric dashboard metrics now color-coded; replaced "Used" button with an ❌ icon; unified green styling for + Add buttons.

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests

## 📄 License

This project is open source and available under the MIT License.

## 👨‍💻 Developer

Built with ❤️ using modern web technologies and GitHub Copilot

---

**Happy Expense Tracking! 💸**
