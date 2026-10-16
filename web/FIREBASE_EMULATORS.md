# Friend spending local test setup

Friend requests and spending summaries are disabled on the hosted preview because that site uses the shared Firebase project. Use the demo Firebase Emulator project for end-to-end testing.

The Emulator Suite requires Java and the Firebase CLI; `npm run emulators:start` downloads the CLI on first use if it is not already installed.

1. Copy `.env.emulator.example` to `.env.local` in `web/`.
2. In one terminal, run `npm run emulators:start` from `web/`.
3. In a second terminal, run `npm run dev` and sign in through the app's Auth Emulator.
4. In a third terminal, run `npm run test:friend-emulator`. It creates two temporary demo accounts, verifies direct Firestore request and opt-in writes, confirms raw expense documents stay private while date-filtered summaries can be read, then removes the friendship and test summary data.

The emulator command uses `demo-expense-manager`, so it cannot write to the configured live Firebase project. The hosted preview keeps this feature disabled until an independent test backend is available.
