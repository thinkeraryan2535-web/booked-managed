const url = 'https://api.supabase.com/v1/projects/ovbysfywosssiiaqcxkc/config/auth';
const token = 'sbp_221c9ff79338149d18d26098c1a72566fcb580ed';

fetch(url, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    site_url: 'http://localhost:8080',
    additional_redirect_urls: []
  })
})
.then(res => res.json())
.then(data => {
  console.log("Config updated:", data);
})
.catch(err => console.error(err));
