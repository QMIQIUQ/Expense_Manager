import { Window } from 'happy-dom';
import { vi } from 'vitest';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';
const window = new Window({ url: 'http://127.0.0.1:4179' });
// Keep Node's native fetch for SDK/REST integration; provide only browser storage/events.
vi.stubGlobal('window', window);
vi.stubGlobal('document', window.document);
vi.stubGlobal('navigator', window.navigator);
vi.stubGlobal('localStorage', window.localStorage);
vi.stubGlobal('sessionStorage', window.sessionStorage);
vi.stubGlobal('CustomEvent', window.CustomEvent);
vi.stubGlobal('indexedDB', indexedDB);
vi.stubGlobal('IDBKeyRange', IDBKeyRange);
