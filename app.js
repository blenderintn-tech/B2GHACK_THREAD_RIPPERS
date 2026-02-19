// app.js – Univ-Verse Complete (Tasks 1‑5)
// Includes: Auth, Courses, Progress Tracking, Badges, Job Listings, Visual Progress Bars

let currentUser = null;
let userPrefs = { language: 'en', willingnessToPay: 30, captions: false, islAvatar: false };
let youtubePlayer;
let progressInterval = null; // for updating video progress bar
let currentCourse = null;
let currentModuleIndex = 0;

// Load YouTube IFrame API
let tag = document.createElement('script');
tag.src = 'https://www.youtube.com/iframe_api';
let firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);


// ---------- NETWORK DETECTION & LOW‑BANDWIDTH MODE ----------
function updateNetworkStatus() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const isOnline = navigator.onLine;
  
  let status = 'online';
  let bandwidthClass = '';
  
  if (!isOnline) {
    status = 'offline';
    bandwidthClass = 'offline';
  } else if (connection) {
    const type = connection.effectiveType; // 'slow-2g', '2g', '3g', '4g'
    const downlink = connection.downlink; // Mbps
    if (type === 'slow-2g' || type === '2g' || downlink < 0.5) {
      status = '2g';
      bandwidthClass = 'slow'; // matches .network-badge.slow in CSS
      document.body.classList.add('low-bandwidth'); // for image optimizations
    } else {
      document.body.classList.remove('low-bandwidth');
    }
  }

  // Add/remove offline class on body
  if (bandwidthClass === 'offline') {
    document.body.classList.add('offline');
  } else {
    document.body.classList.remove('offline');
  }

  // Update or create network badge
  let badge = document.getElementById('network-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'network-badge';
    document.body.appendChild(badge);
  }
  badge.className = `network-badge ${bandwidthClass}`;
  badge.textContent = status === 'offline' ? '📡 Offline' : (status === '2g' ? '🐢 2G Mode' : '');
}

// Listen for online/offline events
window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);

// Listen for connection changes (if supported)
if ('connection' in navigator) {
  navigator.connection.addEventListener('change', updateNetworkStatus);
}

// Initial call
updateNetworkStatus();

// Check auth state
auth.onAuthStateChanged(async (user) => {
  if (user) {
    currentUser = user;
    const doc = await db.collection('users').doc(user.uid).get();
    if (doc.exists) {
      userPrefs = { ...userPrefs, ...doc.data().preferences };
    }
    loadCourses();
    loadJobs();
    showDashboard();
  } else {
    showAuthScreen();
  }
});

// ---------- AUTH SCREEN (Registration/Login) ----------
function showAuthScreen() {
  document.getElementById('app').innerHTML = `
    <div class="bg-white rounded-lg shadow-lg p-6">
      <h2 class="text-2xl font-bold text-center text-blue-600 mb-6">Univ-Verse</h2>
      <p class="text-gray-600 text-center mb-6">Unlocking Informal Skills for Formal Opportunities</p>
      
      <div id="auth-tabs" class="flex mb-6">
        <button id="tab-login" class="flex-1 py-2 font-medium border-b-2 border-blue-600 text-blue-600">Login</button>
        <button id="tab-register" class="flex-1 py-2 font-medium text-gray-500">Register</button>
      </div>
      
      <div id="auth-forms">
        <!-- Login form -->
        <div id="login-form">
          <input type="email" id="login-email" placeholder="Email" class="w-full p-3 mb-3 border rounded-lg">
          <input type="password" id="login-password" placeholder="Password" class="w-full p-3 mb-4 border rounded-lg">
          <button id="login-btn" class="w-full bg-blue-600 text-white py-3 rounded-lg font-medium">Login</button>
        </div>
        
        <!-- Register form (hidden initially) -->
        <div id="register-form" class="hidden">
          <input type="text" id="reg-name" placeholder="Full Name" class="w-full p-3 mb-3 border rounded-lg">
          <input type="email" id="reg-email" placeholder="Email" class="w-full p-3 mb-3 border rounded-lg">
          <input type="password" id="reg-password" placeholder="Password (min 6 chars)" class="w-full p-3 mb-3 border rounded-lg">
          
          <label class="block text-gray-700 mb-2">Preferred Language</label>
          <select id="reg-language" class="w-full p-3 mb-3 border rounded-lg">
            <option value="hi">हिन्दी (Hindi)</option>
            <option value="ta">தமிழ் (Tamil)</option>
            <option value="en" selected>English</option>
          </select>
          
          <label class="block text-gray-700 mb-2">Willingness to pay (₹/month)</label>
          <input type="range" id="reg-wtp" min="0" max="100" step="5" value="30" class="w-full mb-2">
          <div class="flex justify-between text-sm text-gray-600 mb-4">
            <span>₹0</span>
            <span id="wtp-value">₹30</span>
            <span>₹100</span>
          </div>
          
          <div class="mb-4">
            <label class="flex items-center mb-2">
              <input type="checkbox" id="reg-captions" class="mr-2">
              <span>I need captions on videos</span>
            </label>
            <label class="flex items-center">
              <input type="checkbox" id="reg-isl" class="mr-2">
              <span>I need sign language avatar</span>
            </label>
          </div>
          
          <button id="register-btn" class="w-full bg-green-600 text-white py-3 rounded-lg font-medium">Create Account</button>
        </div>
      </div>
    </div>
  `;

  // Tab switching
  document.getElementById('tab-login').addEventListener('click', () => {
    document.getElementById('tab-login').className = 'flex-1 py-2 font-medium border-b-2 border-blue-600 text-blue-600';
    document.getElementById('tab-register').className = 'flex-1 py-2 font-medium text-gray-500';
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('register-form').classList.add('hidden');
  });

  document.getElementById('tab-register').addEventListener('click', () => {
    document.getElementById('tab-register').className = 'flex-1 py-2 font-medium border-b-2 border-blue-600 text-blue-600';
    document.getElementById('tab-login').className = 'flex-1 py-2 font-medium text-gray-500';
    document.getElementById('register-form').classList.remove('hidden');
    document.getElementById('login-form').classList.add('hidden');
  });

  // Update WTP display
  document.getElementById('reg-wtp').addEventListener('input', (e) => {
    document.getElementById('wtp-value').textContent = `₹${e.target.value}`;
  });

  // Login handler
  document.getElementById('login-btn').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    try {
      await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
      alert('Login failed: ' + error.message);
    }
  });

  // Register handler
  document.getElementById('register-btn').addEventListener('click', async () => {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const language = document.getElementById('reg-language').value;
    const wtp = parseInt(document.getElementById('reg-wtp').value);
    const captions = document.getElementById('reg-captions').checked;
    const isl = document.getElementById('reg-isl').checked;
    
    if (!name || !email || !password) {
      alert('Please fill all fields');
      return;
    }
    
    try {
      const userCred = await auth.createUserWithEmailAndPassword(email, password);
      await db.collection('users').doc(userCred.user.uid).set({
        name: name,
        email: email,
        preferences: { language, willingnessToPay: wtp, captions, islAvatar: isl },
        badges: [],
        progress: {},
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      alert('Account created successfully!');
    } catch (error) {
      alert('Registration failed: ' + error.message);
    }
  });
}

// ---------- LOAD COURSES (generate dummy) ----------
function loadCourses() {
  if (!localStorage.getItem('courses')) {
    generateDummyCourses();
  }
}

// Generate 50+ dummy courses
function generateDummyCourses() {
  const categories = ['Digital Literacy', 'Data Entry', 'Tailoring & Handicrafts', 'Customer Service', 'English Communication', 'E-Commerce'];
  const levels = ['Beginner', 'Intermediate', 'Advanced'];
  const videoIds = ['dQw4w9WgXcQ', '3JZ_D3ELwOQ', 'Rf4GQuU3xas', 'vZ7Bq4qWtM0', 'jNQXAC9IVRw'];
  const courses = [];
  
  for (let i = 1; i <= 50; i++) {
    const cat = categories[Math.floor(Math.random() * categories.length)];
    const level = levels[Math.floor(Math.random() * levels.length)];
    const videoId = videoIds[Math.floor(Math.random() * videoIds.length)];
    const students = Math.floor(Math.random() * 5000) + 200;
    const rating = (Math.random() * 2 + 3).toFixed(1);
    const moduleCount = Math.floor(Math.random() * 4) + 3; // 3-6 modules
    const modules = [];
    for (let j = 1; j <= moduleCount; j++) {
      modules.push(`Module ${j}: ${cat} Basics`);
    }
    
    courses.push({
      id: `course${i}`,
      title: `${cat} - ${level} Course ${i}`,
      category: cat,
      description: `Learn ${cat} skills at ${level} level. Perfect for beginners.`,
      videoId: videoId,
      duration: `${Math.floor(Math.random() * 5) + 2} hrs`,
      level: level,
      students: students,
      rating: rating,
      modules: modules
    });
  }
  
  localStorage.setItem('courses', JSON.stringify(courses));
}

// ---------- LOAD JOBS (generate dummy) ----------
function loadJobs() {
  if (!localStorage.getItem('jobs')) {
    generateDummyJobs();
  }
}

// Generate 50+ dummy jobs
function generateDummyJobs() {
  const companies = ['TCS', 'Infosys', 'Wipro', 'HCL', 'Tech Mahindra', 'Flipkart', 'Amazon', 'Zomato', 'Swiggy', 'Reliance', 'Tata Motors', 'Bajaj', 'L&T', 'Godrej', 'Mahindra'];
  const locations = ['Patna, Bihar', 'Gaya, Bihar', 'Muzaffarpur, Bihar', 'Chennai, Tamil Nadu', 'Coimbatore, Tamil Nadu', 'Madurai, Tamil Nadu', 'Remote', 'Hybrid'];
  const jobTitles = ['Data Entry Operator', 'Digital Payment Trainer', 'Customer Support Executive', 'Field Sales Agent', 'Tailoring Instructor', 'E-commerce Assistant', 'Office Assistant', 'UPI Coordinator', 'Handicraft Quality Checker', 'Typist'];
  const skillsMap = {
    'Data Entry Operator': ['data entry', 'typing', 'excel'],
    'Digital Payment Trainer': ['digital literacy', 'upi', 'training'],
    'Customer Support Executive': ['communication', 'customer service'],
    'Field Sales Agent': ['sales', 'communication'],
    'Tailoring Instructor': ['tailoring', 'teaching'],
    'E-commerce Assistant': ['e-commerce', 'product listing', 'photography'],
    'Office Assistant': ['data entry', 'office', 'communication'],
    'UPI Coordinator': ['digital literacy', 'upi'],
    'Handicraft Quality Checker': ['tailoring', 'handicraft'],
    'Typist': ['typing', 'data entry']
  };
  
  const jobs = [];
  for (let i = 1; i <= 50; i++) {
    const title = jobTitles[Math.floor(Math.random() * jobTitles.length)];
    const company = companies[Math.floor(Math.random() * companies.length)];
    const location = locations[Math.floor(Math.random() * locations.length)];
    const salary = `₹${Math.floor(Math.random() * 20000) + 8000} - ₹${Math.floor(Math.random() * 30000) + 20000}`;
    const type = Math.random() > 0.5 ? 'Full-time' : 'Part-time';
    const requiredSkills = skillsMap[title] || [title.toLowerCase()];
    
    jobs.push({
      id: `job${i}`,
      title,
      company,
      location,
      salary,
      type,
      requiredSkills,
      posted: `${Math.floor(Math.random() * 15) + 1} days ago`
    });
  }
  localStorage.setItem('jobs', JSON.stringify(jobs));
}

// ---------- DASHBOARD (Course List) ----------
function showDashboard() {
  const courses = JSON.parse(localStorage.getItem('courses')) || [];
  const categories = [...new Set(courses.map(c => c.category))];
  
  let html = `
    <div class="bg-white rounded-lg shadow-lg p-4">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold text-blue-600">Univ-Verse</h2>
        <div>
          <button id="jobs-btn" class="bg-green-600 text-white px-3 py-1 rounded text-sm mr-2">Jobs</button>
          <button id="skills-btn" class="bg-purple-600 text-white px-3 py-1 rounded text-sm mr-2">My Skills</button>
          <button id="logout-btn" class="bg-red-500 text-white px-3 py-1 rounded text-sm">Logout</button>
        </div>
      </div>
      <div class="mb-4">
        <input type="text" id="search-courses" placeholder="Search courses..." class="w-full p-2 border rounded">
      </div>
  `;
  
  categories.forEach(cat => {
    const catCourses = courses.filter(c => c.category === cat);
    html += `
      <div class="mb-6">
        <h3 class="text-lg font-semibold mb-2">${cat} (${catCourses.length})</h3>
        <div class="flex overflow-x-auto space-x-3 pb-2">
    `;
    catCourses.forEach(course => {
      html += `
        <div class="flex-shrink-0 w-40 bg-gray-100 rounded-lg p-2 cursor-pointer course-card" data-id="${course.id}">
          <img src="https://img.youtube.com/vi/${course.videoId}/0.jpg" class="w-full h-20 object-cover rounded">
          <h4 class="font-medium text-sm mt-1">${course.title}</h4>
          <p class="text-xs text-gray-600">${course.students} students</p>
          <p class="text-xs text-yellow-500">★ ${course.rating}</p>
        </div>
      `;
    });
    html += `</div></div>`;
  });
  
  html += `</div>`;
  document.getElementById('app').innerHTML = html;
  
  document.querySelectorAll('.course-card').forEach(card => {
    card.addEventListener('click', () => {
      const courseId = card.dataset.id;
      showCoursePlayer(courseId);
    });
  });
  
  document.getElementById('jobs-btn').addEventListener('click', showJobsPage);
  document.getElementById('skills-btn').addEventListener('click', showSkillsPage);
  document.getElementById('logout-btn').addEventListener('click', () => auth.signOut());
}

// ---------- MY SKILLS PAGE ----------
async function showSkillsPage() {
  const userDoc = await db.collection('users').doc(currentUser.uid).get();
  const badges = userDoc.data().badges || [];
  
  let html = `
    <div class="bg-white rounded-lg shadow-lg p-4">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold text-blue-600">My Skills</h2>
        <button id="back-btn" class="bg-gray-500 text-white px-3 py-1 rounded text-sm">Back</button>
      </div>
  `;
  
  if (badges.length === 0) {
    html += `<p class="text-gray-600">You haven't earned any badges yet. Complete courses to get certified!</p>`;
  } else {
    html += `<div class="grid grid-cols-2 gap-3">`;
    badges.forEach(badge => {
      html += `
        <div class="bg-green-100 p-3 rounded-lg text-center">
          <div class="text-3xl mb-1">🏅</div>
          <h3 class="font-bold">${badge.name}</h3>
          <p class="text-xs text-gray-600">${new Date(badge.earnedAt).toLocaleDateString()}</p>
        </div>
      `;
    });
    html += `</div>`;
  }
  
  html += `</div>`;
  document.getElementById('app').innerHTML = html;
  
  document.getElementById('back-btn').addEventListener('click', showDashboard);
}

// ---------- COURSE PLAYER WITH PROGRESS BARS ----------
async function showCoursePlayer(courseId) {
  // Clear any previous progress interval
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }

  const courses = JSON.parse(localStorage.getItem('courses')) || [];
  const course = courses.find(c => c.id === courseId);
  if (!course) return;
  
  currentCourse = course;
  currentModuleIndex = 0;
  
  // Get user progress for this course from Firestore
  const userDoc = await db.collection('users').doc(currentUser.uid).get();
  const userProgress = userDoc.data().progress || {};
  const courseProgress = userProgress[course.id] || { modulesCompleted: [], completed: false };
  
  renderPlayer(courseProgress);
}

function calculateMatchPercentage(requiredSkills, userBadges) {
  if (!requiredSkills.length || !userBadges.length) return 0;
  
  // Convert user badges to lowercase skill strings
  const userSkillSet = new Set(userBadges.map(b => b.name.toLowerCase()));
  
  // Count how many required skills are present in user's skills
  let matchCount = 0;
  requiredSkills.forEach(skill => {
    if (userSkillSet.has(skill.toLowerCase())) matchCount++;
  });
  
  return Math.round((matchCount / requiredSkills.length) * 100);
}


function renderPlayer(courseProgress) {
  const course = currentCourse;
  const moduleIndex = currentModuleIndex;
  const module = course.modules[moduleIndex];
  
  // Dummy captions
  const captionLines = [
    "Welcome to this module. Let's learn the basics.",
    "Now we'll practice with an example.",
    "Great job! Let's review what we've learned.",
    "Final quiz: test your knowledge."
  ];
  const captionText = `[${module}] – ${captionLines[moduleIndex % captionLines.length]}`;
  
  // Calculate module completion percentage for this course
  const modulesCompletedCount = courseProgress.modulesCompleted.length;
  const totalModules = course.modules.length;
  const moduleProgressPercent = (modulesCompletedCount / totalModules) * 100;
  
  document.getElementById('app').innerHTML = `
    <div class="bg-white rounded-lg shadow-lg p-4">
      <style>
        @keyframes wave {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(10deg); }
          75% { transform: rotate(-10deg); }
          100% { transform: rotate(0deg); }
        }
        .wave-animation {
          animation: wave 1s infinite ease-in-out;
          transform-origin: bottom center;
        }
      </style>
      <button id="back-btn" class="text-blue-600 mb-2">← Back to Courses</button>
      <h2 class="text-xl font-bold mb-2">${course.title}</h2>
      <p class="text-sm text-gray-600 mb-2">${course.description}</p>
      
      <div class="relative mb-4" style="padding-bottom: 56.25%; height: 0;">
        <div id="player-container" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></div>
        
        <!-- Captions overlay -->
        <div id="caption-overlay" class="caption-overlay ${userPrefs.captions ? '' : 'hidden'}">${captionText}</div>
        
        <!-- ISL Avatar with wave animation -->
        <div id="isl-avatar" class="isl-avatar ${userPrefs.islAvatar ? '' : 'hidden'} wave-animation">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="blue" stroke-width="1.5">
            <circle cx="12" cy="8" r="4" stroke="currentColor" />
            <path d="M5 18v2a2 2 0 002 2h10a2 2 0 002-2v-2" stroke="currentColor" />
            <path d="M12 12v6M9 15h6" stroke="currentColor" />
            <path d="M8 10l-2 2 2 2" stroke="currentColor" />
            <path d="M16 10l2 2-2 2" stroke="currentColor" />
          </svg>
        </div>
      </div>
      
      <!-- Video watch progress bar -->
      <div class="mb-2">
        <div class="flex justify-between text-xs text-gray-600">
          <span>Video progress</span>
          <span id="watch-percent">0%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2.5">
          <div id="video-progress-bar" class="bg-blue-600 h-2.5 rounded-full" style="width: 0%"></div>
        </div>
      </div>
      
      <!-- Course completion progress bar -->
      <div class="mb-3">
        <div class="flex justify-between text-xs text-gray-600">
          <span>Course completion</span>
          <span>${modulesCompletedCount}/${totalModules} modules</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2.5">
          <div id="module-progress-bar" class="bg-green-600 h-2.5 rounded-full" style="width: ${moduleProgressPercent}%"></div>
        </div>
      </div>
      
      <div class="flex justify-between items-center mb-4">
        <div>
          <button id="toggle-captions" class="bg-gray-200 px-3 py-1 rounded text-sm mr-2">Captions: ${userPrefs.captions ? 'ON' : 'OFF'}</button>
          <button id="toggle-isl" class="bg-gray-200 px-3 py-1 rounded text-sm">ISL: ${userPrefs.islAvatar ? 'ON' : 'OFF'}</button>
        </div>
        <span class="text-sm">Module ${moduleIndex+1}/${totalModules}: ${module}</span>
      </div>
      
      <div class="flex justify-between">
        <button id="prev-module" class="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50" ${moduleIndex === 0 ? 'disabled' : ''}>Previous</button>
        <button id="complete-module" class="bg-green-600 text-white px-4 py-2 rounded">Complete Module</button>
        <button id="next-module" class="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50" ${moduleIndex === totalModules-1 ? 'disabled' : ''}>Next</button>
      </div>
      
      <div id="watch-status" class="text-sm text-center mt-2 text-gray-600"></div>
    </div>
  `;
  
  // Load YouTube player
  youtubePlayer = new YT.Player('player-container', {
    height: '100%',
    width: '100%',
    videoId: course.videoId,
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
  
  function onPlayerReady(event) {
    // Start tracking video progress
    startProgressTracking();
  }
  
  function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
      startProgressTracking();
    } else if (event.data === YT.PlayerState.ENDED) {
      document.getElementById('watch-status').textContent = 'Video finished! You can now complete the module.';
      // Force progress to 100%
      if (document.getElementById('video-progress-bar')) {
        document.getElementById('video-progress-bar').style.width = '100%';
        document.getElementById('watch-percent').textContent = '100%';
      }
    }
  }
  
  function startProgressTracking() {
    if (progressInterval) clearInterval(progressInterval);
    progressInterval = setInterval(() => {
      if (youtubePlayer && youtubePlayer.getDuration) {
        const duration = youtubePlayer.getDuration();
        const currentTime = youtubePlayer.getCurrentTime();
        const percent = (currentTime / duration) * 100;
        if (!isNaN(percent)) {
          const progressBar = document.getElementById('video-progress-bar');
          const percentSpan = document.getElementById('watch-percent');
          if (progressBar) {
            progressBar.style.width = percent + '%';
          }
          if (percentSpan) {
            percentSpan.textContent = Math.round(percent) + '%';
          }
        }
      }
    }, 1000);
  }
  
  // Event listeners
  document.getElementById('back-btn').addEventListener('click', () => {
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
    showDashboard();
  });
  
  document.getElementById('toggle-captions').addEventListener('click', () => {
    userPrefs.captions = !userPrefs.captions;
    document.getElementById('caption-overlay').classList.toggle('hidden');
    document.getElementById('toggle-captions').textContent = `Captions: ${userPrefs.captions ? 'ON' : 'OFF'}`;
  });
  
  document.getElementById('toggle-isl').addEventListener('click', () => {
    userPrefs.islAvatar = !userPrefs.islAvatar;
    document.getElementById('isl-avatar').classList.toggle('hidden');
    document.getElementById('toggle-isl').textContent = `ISL: ${userPrefs.islAvatar ? 'ON' : 'OFF'}`;
  });
  
  document.getElementById('prev-module').addEventListener('click', () => {
    if (currentModuleIndex > 0) {
      currentModuleIndex--;
      // Re‑render with updated courseProgress
      db.collection('users').doc(currentUser.uid).get().then(doc => {
        const prog = doc.data().progress || {};
        const cp = prog[course.id] || { modulesCompleted: [], completed: false };
        renderPlayer(cp);
      });
    }
  });
  
  document.getElementById('next-module').addEventListener('click', () => {
    if (currentModuleIndex < course.modules.length-1) {
      currentModuleIndex++;
      db.collection('users').doc(currentUser.uid).get().then(doc => {
        const prog = doc.data().progress || {};
        const cp = prog[course.id] || { modulesCompleted: [], completed: false };
        renderPlayer(cp);
      });
    }
  });
  
  document.getElementById('complete-module').addEventListener('click', async () => {
    if (!youtubePlayer) {
      alert('Video not loaded yet. Please wait.');
      return;
    }
    
    const duration = youtubePlayer.getDuration();
    const currentTime = youtubePlayer.getCurrentTime();
    const watchPercentage = (currentTime / duration) * 100;
    
    if (watchPercentage < 80 && youtubePlayer.getPlayerState() !== YT.PlayerState.ENDED) {
      alert(`Please watch at least 80% of the video (currently ${Math.round(watchPercentage)}%). You can also let the video finish.`);
      return;
    }
    
    const userRef = db.collection('users').doc(currentUser.uid);
    const userDoc = await userRef.get();
    let progress = userDoc.data().progress || {};
    
    if (!progress[course.id]) {
      progress[course.id] = { modulesCompleted: [], completed: false };
    }
    
    if (progress[course.id].modulesCompleted.includes(module)) {
      alert('You already completed this module.');
      return;
    }
    
    progress[course.id].modulesCompleted.push(module);
    
    // Update module progress bar immediately (without full re-render)
    const newCount = progress[course.id].modulesCompleted.length;
    const moduleBar = document.getElementById('module-progress-bar');
    if (moduleBar) {
      const newPercent = (newCount / totalModules) * 100;
      moduleBar.style.width = newPercent + '%';
    }
    // Also update the text
    const moduleText = document.querySelector('.flex.justify-between.text-xs.text-gray-600 span:last-child');
    if (moduleText) {
      moduleText.textContent = `${newCount}/${totalModules} modules`;
    }
    
    if (newCount === totalModules) {
      progress[course.id].completed = true;
      
      const badges = userDoc.data().badges || [];
      badges.push({
        name: course.title,
        earnedAt: new Date().toISOString(),
        courseId: course.id
      });
      await userRef.update({ progress, badges });
      alert(`🎉 Congratulations! You completed the course and earned a badge!`);
    } else {
      await userRef.update({ progress });
      alert(`Module "${module}" completed! (${newCount}/${totalModules} modules done)`);
    }
    
    // Disable complete button to prevent double-click
    document.getElementById('complete-module').disabled = true;
    document.getElementById('complete-module').classList.add('opacity-50');
  });
}

// ---------- JOB LISTINGS PAGE ----------
async function showJobsPage() {
  // Fetch user badges from Firestore
  const userDoc = await db.collection('users').doc(currentUser.uid).get();
  const userBadges = userDoc.data().badges || [];
  
  const jobs = JSON.parse(localStorage.getItem('jobs')) || [];
  const locations = [...new Set(jobs.map(j => j.location))];
  
  // Compute match for each job and sort by match descending
  const jobsWithMatch = jobs.map(job => ({
    ...job,
    match: calculateMatchPercentage(job.requiredSkills, userBadges)
  }));
  const sortedJobs = jobsWithMatch.sort((a, b) => b.match - a.match);
  
  let html = `
    <div class="bg-white rounded-lg shadow-lg p-4">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold text-blue-600">Job Opportunities</h2>
        <button id="back-btn" class="bg-gray-500 text-white px-3 py-1 rounded text-sm">Back</button>
      </div>
      
      <div class="mb-4 grid grid-cols-2 gap-2">
        <select id="filter-location" class="p-2 border rounded">
          <option value="">All Locations</option>
          ${locations.map(loc => `<option value="${loc}">${loc}</option>`).join('')}
        </select>
        <input type="text" id="search-jobs" placeholder="Search jobs..." class="p-2 border rounded">
      </div>
      
      <div id="jobs-list" class="space-y-3">
        ${renderJobCards(sortedJobs, userBadges)}
      </div>
    </div>
  `;
  
  document.getElementById('app').innerHTML = html;
  
  document.getElementById('back-btn').addEventListener('click', showDashboard);
  
  document.getElementById('filter-location').addEventListener('change', () => filterJobs(userBadges));
  document.getElementById('search-jobs').addEventListener('input', () => filterJobs(userBadges));
}

// Render job cards
function renderJobCards(jobs, userBadges) {
  if (jobs.length === 0) return '<p class="text-gray-600">No jobs found.</p>';
  
  return jobs.map(job => {
    // Re‑calculate match (or use pre‑computed if passed)
    const match = job.match !== undefined ? job.match : calculateMatchPercentage(job.requiredSkills, userBadges);
    
    // Determine color class
    let matchColor = 'bg-red-100 text-red-800';
    if (match >= 70) matchColor = 'bg-green-100 text-green-800';
    else if (match >= 40) matchColor = 'bg-yellow-100 text-yellow-800';
    
    return `
      <div class="border rounded-lg p-3 hover:shadow-md">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="font-bold">${job.title}</h3>
            <p class="text-sm text-gray-600">${job.company} • ${job.location}</p>
          </div>
          <span class="${matchColor} text-xs font-semibold px-2 py-1 rounded">${match}% Match</span>
        </div>
        <p class="text-sm text-green-600 mt-1">${job.salary}</p>
        <p class="text-xs text-gray-500">${job.type} • Posted ${job.posted}</p>
        <div class="flex flex-wrap gap-1 mt-2">
          ${job.requiredSkills.map(skill => `<span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">${skill}</span>`).join('')}
        </div>
        <button class="mt-2 bg-blue-600 text-white px-3 py-1 rounded text-sm apply-btn" data-job-id="${job.id}">Apply</button>
      </div>
    `;
  }).join('');
}
// Filter jobs based on location and search
function filterJobs(userBadges) {
  const jobs = JSON.parse(localStorage.getItem('jobs')) || [];
  const locationFilter = document.getElementById('filter-location').value;
  const searchTerm = document.getElementById('search-jobs').value.toLowerCase();
  
  // Filter
  let filtered = jobs.filter(job => {
    const matchLocation = !locationFilter || job.location === locationFilter;
    const matchSearch = !searchTerm || 
      job.title.toLowerCase().includes(searchTerm) ||
      job.company.toLowerCase().includes(searchTerm) ||
      job.requiredSkills.some(s => s.toLowerCase().includes(searchTerm));
    return matchLocation && matchSearch;
  });
  
  // Re‑attach match scores and sort
  filtered = filtered.map(job => ({
    ...job,
    match: calculateMatchPercentage(job.requiredSkills, userBadges)
  })).sort((a, b) => b.match - a.match);
  
  document.getElementById('jobs-list').innerHTML = renderJobCards(filtered, userBadges);
  
  // Re-attach apply button listeners
  document.querySelectorAll('.apply-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const jobId = e.target.dataset.jobId;
      alert(`Applied to job ${jobId} (simulated). In full version, this would save to your profile.`);
    });
  });
}
// Make YT API ready callback global
window.onYouTubeIframeAPIReady = function() {
  console.log('YouTube API ready');
};