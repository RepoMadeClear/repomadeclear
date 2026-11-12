const query = new URLSearchParams(location.search);

async function request(action, extra = {}) {
  const response = await fetch('/api/github', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({...Object.fromEntries(query), ...extra, action}),
  });
  const result = await response.json();
  if (response.status === 401) {
    location.assign('/#login');
    throw new Error('Sign in to continue.');
  }
  if (!response.ok) throw new Error(result.error || 'Could not open this map.');
  return result;
}

globalThis.rmcLoadMap = () => request('details');
globalThis.rmcSaveEdit = (operation, version) => request('edit', {operation, version});

try {
  await import('./workspace/app.js');
} catch (error) {
  const main = document.querySelector('main');
  main.replaceChildren();
  const heading = document.createElement('h1');
  heading.textContent = 'Map unavailable';
  const message = document.createElement('p');
  message.textContent = error.message;
  const link = document.createElement('a');
  link.href = '/#login';
  link.textContent = 'Return to your account';
  main.append(heading, message, link);
}
