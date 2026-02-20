import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', minHeight: '100vh',
                    background: '#0f0f17', color: '#e2e8f0', fontFamily: 'Inter, sans-serif',
                    padding: '2rem', textAlign: 'center'
                }}>
                    <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Something went wrong</h1>
                    <p style={{ color: '#94a3b8', marginBottom: '1.5rem', maxWidth: '500px' }}>
                        An unexpected error occurred. Your work has been auto-saved.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            onClick={this.handleReset}
                            style={{
                                padding: '0.75rem 1.5rem', background: '#6366f1', color: 'white',
                                border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem'
                            }}
                        >
                            Try Again
                        </button>
                        <button
                            onClick={() => window.location.href = '/'}
                            style={{
                                padding: '0.75rem 1.5rem', background: '#1e1e2e', color: '#e2e8f0',
                                border: '1px solid #334155', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem'
                            }}
                        >
                            Go Home
                        </button>
                    </div>
                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <pre style={{
                            marginTop: '2rem', padding: '1rem', background: '#1a1a2e',
                            borderRadius: '8px', fontSize: '0.8rem', color: '#ef4444',
                            maxWidth: '600px', overflow: 'auto', textAlign: 'left'
                        }}>
                            {this.state.error.toString()}
                        </pre>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
