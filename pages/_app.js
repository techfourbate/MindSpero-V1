import NavBar from '@/components/NavBar';
import '@/styles/globals.css';
import AuthGuard from '@/components/AuthGuard';

export default function App({ Component, pageProps }) {
  return (
    <>
      <NavBar />
      <div style={{ minHeight: 'calc(100vh - 70px)', padding: '2rem' }}>
        <AuthGuard>
          <Component {...pageProps} />
        </AuthGuard>
      </div>
    </>
  );
}
