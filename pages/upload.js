import { useState } from 'react';
import { useRouter } from 'next/router';
import supabase from '../lib/supabaseClient';

export default function Upload() {
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }

    setError('');
    setStatus('Checking access...');
    setUploading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setError('You must be logged in');
        setUploading(false);
        return;
      }

      const user = session.user;

      setStatus('Uploading file...');
      const fileName = `${Date.now()}-${file.name}`;
      const { data, error: uploadError } = await supabase.storage
        .from('notes')
        .upload(`${user.id}/${fileName}`, file);

      if (uploadError) {
        setError(uploadError.message);
        setUploading(false);
        return;
      }

      setStatus('Processing your notes...');
      const res = await fetch('/api/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          filePath: data.path,
          fileName: file.name,
        }),
      });

      if (res.ok) {
        setStatus('Processing complete! Redirecting...');
        setTimeout(() => router.push('/dashboard'), 2000);
      } else {
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.error || 'Processing failed. Please try again.');
        setUploading(false);
      }
    } catch (err) {
      setError(err.message);
      setUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '2rem' }}>
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)'
      }}>
        <h2 style={{ marginTop: 0 }}>Upload Your Lecture Notes</h2>
        <p style={{ color: '#64748b' }}>
          Upload PDF, DOCX, or TXT files and we'll simplify them for you
        </p>

        {error && (
          <div style={{
            background: '#fee2e2',
            color: '#7f1d1d',
            padding: '1rem',
            borderRadius: '6px',
            marginBottom: '1rem',
            border: '1px solid #fecaca'
          }}>
            {error}
          </div>
        )}

        {status && (
          <div style={{
            background: '#dbeafe',
            color: '#1e3a8a',
            padding: '1rem',
            borderRadius: '6px',
            marginBottom: '1rem',
            border: '1px solid #93c5fd'
          }}>
            {status}
          </div>
        )}

        <form onSubmit={handleUpload}>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.style.background = '#f0f9ff';
              e.currentTarget.style.borderColor = '#1e40af';
            }}
            onDragLeave={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.borderColor = '#e2e8f0';
              if (e.dataTransfer.files[0]) {
                setFile(e.dataTransfer.files[0]);
              }
            }}
            style={{
              border: '2px dashed #e2e8f0',
              borderRadius: '8px',
              padding: '2rem',
              textAlign: 'center',
              cursor: 'pointer',
              marginBottom: '1.5rem',
              transition: 'all 0.2s'
            }}
          >
            <input
              type="file"
              accept=".pdf,.docx,.txt,.doc"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              style={{ display: 'none' }}
              id="fileInput"
              disabled={uploading}
            />
            <label htmlFor="fileInput" style={{ cursor: uploading ? 'not-allowed' : 'pointer' }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📁</div>
              <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>
                Drag and drop your file
              </div>
              <div style={{ color: '#64748b', marginBottom: '1rem' }}>
                or click to browse
              </div>
              {file && (
                <div style={{ color: '#16a34a', fontWeight: '600' }}>
                  Selected: {file.name}
                </div>
              )}
            </label>
          </div>

          <button
            type="submit"
            disabled={!file || uploading}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: !file || uploading ? '#cbd5e1' : '#1e40af',
              cursor: !file || uploading ? 'not-allowed' : 'pointer'
            }}
          >
            {uploading ? 'Processing...' : 'Upload & Process'}
          </button>
        </form>

        <div style={{
          marginTop: '2rem',
          padding: '1.5rem',
          background: '#f9fafb',
          borderRadius: '6px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
            Supported Formats
          </div>
          <ul style={{ paddingLeft: '1.75rem', margin: 0, color: '#64748b' }}>
            <li>PDF documents</li>
            <li>Word documents (DOCX, DOC)</li>
            <li>Text files (TXT)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
