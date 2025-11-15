# Agent Priority Rules

This document contains essential guidelines for future agents working on this repository. **READ THIS FILE FIRST** before making any changes.

## 🎯 Core Principles

### 1. Unified Styling System
- **ALWAYS** use the centralized theme system located in `/web/src/styles/theme.ts` and `/web/src/styles/designTokens.ts`
- **NEVER** hardcode colors, spacing, or typography values directly in components
- Use Tailwind CSS classes that reference design tokens
- All UI components must follow the established design system
- Icon usage must come from the unified icon library at `/web/src/components/icons/`

### 2. CRUD Consistency
- **CREATE** and **UPDATE** operations MUST have identical validation rules
- Business logic for creating and updating data must be consistent
- Schema validation must be the same for both operations
- Use shared validation functions to prevent inconsistencies
- Example: If creating a category requires a name, icon, and color, updating must validate the same fields

### 3. Build Before Commit
- **ALWAYS** run a successful build before finalizing changes
- Run `npm run build` in the `/web` directory
- Build logs or successful build output MUST be included in the PR description
- Fix ALL build errors and TypeScript type issues
- Address linting errors with `npm run lint`
- CI/CD must pass before merging

### 4. Firebase Rules & Security
- When adding or modifying database collections, **ALWAYS** update `/web/firestore.rules`
- Security rules MUST:
  - Verify user authentication
  - Enforce userId ownership checks
  - Include admin access patterns where appropriate
- Document required Firebase Console actions in PR description:
  - Rule deployment commands
  - Index creation requirements
  - Any configuration changes needed

### 5. Internationalization (i18n)
- **ALL** new UI text MUST be internationalized
- Add translation keys to `/web/src/locales/translations.ts`
- Provide translations for at least:
  - `zh` (Traditional Chinese)
  - `zh-CN` (Simplified Chinese)
  - `en` (English)
- Use the `t()` function from `useLanguage()` hook for all display text
- **NEVER** hardcode user-facing strings in components

## 📝 Development Workflow

### Before Starting
1. Read this document completely
2. Review existing code patterns and conventions
3. Check `/web/src/types/index.ts` for existing type definitions
4. Review service layer patterns in `/web/src/services/`

### During Development
1. Follow TypeScript strict mode - no `any` types
2. Use existing React hooks and contexts
3. Maintain component structure:
   - `/web/src/components/` for reusable components
   - `/web/src/pages/` for page-level components
   - `/web/src/services/` for Firebase service layer
4. Write clean, documented code
5. Test locally with `npm run dev`

### Before PR Submission
1. ✅ Run `npm run build` successfully
2. ✅ Run `npm run lint` and fix all issues
3. ✅ Update Firestore rules if database schema changed
4. ✅ Add i18n translations for new UI text
5. ✅ Test all CRUD operations
6. ✅ Verify authentication and authorization
7. ✅ Check responsive design (mobile & desktop)
8. ✅ Take screenshots of UI changes

## 🗃️ Database & Schema

### Adding New Collections
1. Define TypeScript interface in `/web/src/types/index.ts`
2. Create service module in `/web/src/services/`
3. Update `/web/firestore.rules` with appropriate security rules
4. Document migration steps if needed

### Schema Changes
- Ensure backward compatibility
- Provide migration guide for existing data
- Test with existing user data
- Document breaking changes clearly

## 🎨 UI/UX Guidelines

### Design System
- Color palette: Use CSS variables from theme
- Spacing: Use Tailwind spacing scale (4px base unit)
- Typography: Follow established font sizes and weights
- Components: Reuse existing components before creating new ones
- Icons: Use unified icon library

### Accessibility (a11y)
- Semantic HTML elements
- ARIA labels where needed
- Keyboard navigation support
- Color contrast ratios meet WCAG AA standards
- Focus indicators visible

### Responsive Design
- Mobile-first approach
- Test at breakpoints: 320px, 768px, 1024px, 1440px
- Touch-friendly targets (min 44x44px)
- Responsive images and layouts

## 🧪 Testing

### Required Testing
- Test all user flows manually
- Verify CRUD operations work correctly
- Test with multiple user accounts
- Test offline functionality where applicable
- Test with real Firebase data

### Test Data
- Create seed data for local testing
- Document how to set up test environment
- Provide sample data in PR description

## 📦 Dependencies

### Adding New Packages
- Prefer lightweight, well-maintained packages
- Check bundle size impact
- Verify compatibility with existing stack
- Document why the package is needed
- List in PR description with version and purpose

### Security
- Run `npm audit` before adding dependencies
- Address security vulnerabilities
- No deprecated packages
- Keep dependencies up to date

## 📖 Documentation

### Code Documentation
- JSDoc comments for complex functions
- Inline comments for non-obvious logic
- README updates for new features
- API documentation for new endpoints

### PR Requirements
- Clear title describing the change
- Detailed description including:
  - **Design decisions** made
  - **Migration steps** if applicable
  - **Testing performed** (with steps to reproduce)
  - **Local testing guide** for reviewers
  - **Screenshots** for UI changes
  - **Build logs** showing successful compilation
  - **Breaking changes** if any
  - **Firebase Console actions** needed

## 🔐 Security

### Best Practices
- No secrets in code
- Use environment variables for config
- Validate all user input
- Sanitize data before database writes
- Follow principle of least privilege
- Implement proper error handling without exposing sensitive info

### Authentication
- Always check `currentUser` before operations
- Verify userId ownership
- Use Firebase Auth context
- Handle auth state changes

## 🚀 Performance

### Optimization
- Lazy load components where appropriate
- Optimize bundle size
- Use React.memo for expensive components
- Debounce search inputs
- Paginate large lists
- Use Firebase query limits

### Monitoring
- Check bundle size after changes
- Monitor Firestore read/write counts
- Optimize expensive queries

## 📱 Mobile Considerations

- Touch-friendly UI
- Responsive layouts
- Optimize for smaller screens
- Test on actual devices when possible
- Consider offline support

## 🔄 Version Control

### Commits
- Clear, descriptive commit messages
- Atomic commits (one logical change per commit)
- Follow conventional commits format where possible

### Branches
- Create feature branches from main
- Keep branches up to date with main
- Delete branches after merge

## 🎓 Learning Resources

- Review existing implementations before building similar features
- Check ARCHITECTURE.md for system design
- See FEATURES.md for feature documentation
- Consult existing components for patterns

## ⚠️ Common Pitfalls

1. **Don't skip i18n** - All text must be translatable
2. **Don't forget Firebase rules** - Security is critical
3. **Don't ignore TypeScript errors** - Fix them, don't suppress
4. **Don't hardcode values** - Use design tokens and constants
5. **Don't break builds** - Always test before committing
6. **Don't inconsistent CRUD** - Create and update must match
7. **Don't skip mobile testing** - Responsive design is required

## 📞 Getting Help

If blocked on implementation:
1. Review this document again
2. Check existing similar features
3. Review Firebase documentation
4. Document the blocker clearly in PR

---

**Remember: Quality over speed. Follow these rules to maintain codebase integrity.**
