import { Component, type ReactNode } from 'react';

/** Keep the rest of the page usable if an optional module is not yet cached offline. */
export default class FeatureLoadBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <div role="alert">
      <p>This feature could not load. Reconnect and retry. / 此功能暫時無法載入，請連線後重試。</p>
      <button onClick={() => window.location.reload()}>Retry / 重試</button>
    </div> : this.props.children;
  }
}
