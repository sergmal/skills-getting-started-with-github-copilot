document.addEventListener('DOMContentLoaded', () => {
  const activitiesList = document.getElementById('activities-list');
  const activitySelect = document.getElementById('activity');
  const signupForm = document.getElementById('signup-form');
  const messageEl = document.getElementById('message');

  function showMessage(text, type = 'info') {
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
  }

  function clearMessage() {
    messageEl.textContent = '';
    messageEl.className = 'hidden';
  }

  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function renderActivities(data) {
    activitiesList.innerHTML = '';
    // reset select
    activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

    Object.keys(data).forEach(name => {
      const activity = data[name];
      const participants = Array.isArray(activity.participants) ? activity.participants : [];

      const card = document.createElement('div');
      card.className = 'activity-card';
      card.dataset.activity = name;

      card.innerHTML = `
        <h4>${escapeHTML(name)}</h4>
        <p class="description">${escapeHTML(activity.description || '')}</p>
        <p class="schedule"><strong>Schedule:</strong> ${escapeHTML(activity.schedule || '')}</p>
        <p class="capacity"><strong>Capacity:</strong> ${participants.length} / ${escapeHTML(activity.max_participants)}</p>

        <div class="participants-section">
          <h5 class="participants-title">Participants</h5>
          <ul class="participants-list">
            ${participants.length ? participants.map(p => `<li class="participant-item"><span class="participant-email">${escapeHTML(p)}</span><button class="delete-participant" data-email="${escapeHTML(p)}" aria-label="Remove ${escapeHTML(p)}">✖</button></li>`).join('') : '<li class="participant-item empty">No participants yet</li>'}
          </ul>
        </div>
      `;

      activitiesList.appendChild(card);

      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      activitySelect.appendChild(opt);
    });
  }

  async function loadActivities() {
    try {
      const res = await fetch('/activities');
      if (!res.ok) throw new Error('Failed to load activities');
      const data = await res.json();
      renderActivities(data);
      clearMessage();
    } catch (err) {
      showMessage('Could not load activities. Try refreshing the page.', 'error');
      console.error(err);
    }
  }

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessage();

    const emailEl = document.getElementById('email');
    const activityName = activitySelect.value;
    const email = emailEl.value.trim();

    if (!email || !activityName) {
      showMessage('Please enter your email and select an activity.', 'error');
      return;
    }

    try {
      const url = `/activities/${encodeURIComponent(activityName)}/signup?email=${encodeURIComponent(email)}`;
      const res = await fetch(url, { method: 'POST' });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const detail = errBody.detail || 'Signup failed';
        showMessage(detail, 'error');
        return;
      }
      // Success: reload activities from server so UI reflects actual state
      await loadActivities();

      showMessage(`Signed up ${email} for ${activityName}`, 'success');
      signupForm.reset();
    } catch (err) {
      showMessage('An error occurred during signup.', 'error');
      console.error(err);
    }
  });

  // initial load
  loadActivities();

  // Event delegation: handle participant delete clicks
  activitiesList.addEventListener('click', async (e) => {
    const btn = e.target.closest('.delete-participant');
    if (!btn) return;

    const email = btn.dataset.email;
    const card = btn.closest('.activity-card');
    if (!card || !email) return;

    const activityName = card.dataset.activity;

    try {
      const url = `/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`;
      const res = await fetch(url, { method: 'DELETE' });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const detail = errBody.detail || 'Failed to remove participant';
        showMessage(detail, 'error');
        return;
      }

      // remove the list item from the UI
      const li = btn.closest('li');
      if (li) li.remove();

      // if list is empty after removal, show placeholder
      const ul = card.querySelector('.participants-list');
      if (ul && !ul.querySelector('.participant-item')) {
        const emptyLi = document.createElement('li');
        emptyLi.className = 'participant-item empty';
        emptyLi.textContent = 'No participants yet';
        ul.appendChild(emptyLi);
      }

      // update capacity count (decrement)
      const capEl = card.querySelector('.capacity');
      if (capEl) {
        const match = capEl.textContent.match(/(\d+)\s*\/\s*(\d+)/);
        if (match) {
          let current = parseInt(match[1], 10) - 1;
          if (current < 0) current = 0;
          const max = match[2];
          capEl.innerHTML = `<strong>Capacity:</strong> ${current} / ${max}`;
        }
      }

      showMessage(`Removed ${email} from ${activityName}`, 'success');
    } catch (err) {
      showMessage('An error occurred while removing participant.', 'error');
      console.error(err);
    }
  });
});
