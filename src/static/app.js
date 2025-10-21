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
            ${participants.length ? participants.map(p => `<li class="participant-item">${escapeHTML(p)}</li>`).join('') : '<li class="participant-item empty">No participants yet</li>'}
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

      // Success: update participants list in the UI
      const card = Array.from(document.querySelectorAll('.activity-card'))
        .find(c => c.dataset.activity === activityName);

      if (card) {
        const ul = card.querySelector('.participants-list');
        // remove "No participants yet" placeholder if present
        const emptyItem = ul.querySelector('.participant-item.empty');
        if (emptyItem) emptyItem.remove();

        const li = document.createElement('li');
        li.className = 'participant-item';
        li.textContent = email;
        ul.appendChild(li);

        // update capacity count
        const capEl = card.querySelector('.capacity');
        if (capEl) {
          // parse current values and increment the left side
          const match = capEl.textContent.match(/(\d+)\s*\/\s*(\d+)/);
          if (match) {
            const current = parseInt(match[1], 10) + 1;
            const max = match[2];
            capEl.innerHTML = `<strong>Capacity:</strong> ${current} / ${max}`;
          }
        }
      }

      showMessage(`Signed up ${email} for ${activityName}`, 'success');
      signupForm.reset();
    } catch (err) {
      showMessage('An error occurred during signup.', 'error');
      console.error(err);
    }
  });

  // initial load
  loadActivities();
});
