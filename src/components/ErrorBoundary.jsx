import React from 'react';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('[ErrorBoundary]', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div
                    style={{
                        padding: '16px',
                        color: '#ff4444',
                        backgroundColor: '#1a1a1a',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        overflow: 'auto',
                        height: '100vh',
                        whiteSpace: 'pre-wrap',
                    }}
                >
                    <h3 style={{ color: '#ff6666' }}>React Error:</h3>
                    <p>{String(this.state.error)}</p>
                    <pre>{this.state.error?.stack}</pre>
                </div>
            );
        }
        return this.props.children;
    }
}
