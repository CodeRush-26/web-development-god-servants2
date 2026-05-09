import 'leaflet/dist/leaflet.css';
import { Component } from "react";
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, errorStack: "" };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({
      errorStack: `${error?.stack || ""}\n${info?.componentStack || ""}`.trim(),
    });
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 16, fontFamily: "system-ui, sans-serif" }}>
          <h2 style={{ marginTop: 0 }}>Frontend Runtime Error</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
          {this.state.errorStack ? (
            <pre style={{ whiteSpace: "pre-wrap", marginTop: 12 }}>
              {this.state.errorStack}
            </pre>
          ) : null}
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>,
)
