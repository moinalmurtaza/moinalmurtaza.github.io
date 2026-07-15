document.addEventListener('DOMContentLoaded', () => {
    // Cache UI elements
    const scroller = document.getElementById('editor-scroller');
    const gutter = document.getElementById('editor-gutter');
    const sections = document.querySelectorAll('.editor-section');
    const fileItems = document.querySelectorAll('.file-item');
    const tabItems = document.querySelectorAll('.tab-item');
    
    // Watch Variables Monitor Elements
    const watchCurrentFile = document.getElementById('watch-current-file');
    const watchStackFrame = document.getElementById('watch-stack-frame');
    const scrollOffsetVal = document.getElementById('scroll-offset-val');
    const cpuFill = document.getElementById('cpu-fill');
    const cpuPercent = document.getElementById('cpu-percent');
    
    // Context Inspector Elements
    const inspectorIdleText = document.getElementById('inspector-idle-text');
    const inspectorDataBox = document.getElementById('inspector-data-box');
    const insItemTitle = document.getElementById('ins-item-title');
    const insItemMeta = document.getElementById('ins-item-meta');
    const insItemDesc = document.getElementById('ins-item-desc');
    
    // Footer Console Element
    const footerMsg = document.getElementById('footer-console-msg');
    const cursorPosLabel = document.getElementById('cursor-pos');

    // Terminal Elements
    const terminalStdin = document.getElementById('terminal-stdin');
    const terminalStdout = document.getElementById('terminal-stdout');
    const termButtons = document.querySelectorAll('.term-link-btn');

    /* ==========================================================================
       1. DYNAMIC LINE GUTTER GENERATOR
       ========================================================================== */
    function updateGutterLines() {
        if (!scroller || !gutter) return;
        
        // Approximate height of single line is 24px (font 15px * 1.6 line-height)
        const lineHeight = 24; 
        const scrollHeight = scroller.scrollHeight;
        const lineCount = Math.max(100, Math.ceil(scrollHeight / lineHeight));
        
        // Prevent unnecessary redraws if count hasn't changed
        if (gutter.children.length === lineCount) return;
        
        gutter.innerHTML = '';
        const fragment = document.createDocumentFragment();
        for (let i = 1; i <= lineCount; i++) {
            const line = document.createElement('span');
            line.className = 'line-num';
            line.textContent = i;
            fragment.appendChild(line);
        }
        gutter.appendChild(fragment);
    }

    // Initialize Gutter
    updateGutterLines();
    window.addEventListener('resize', updateGutterLines);

    /* ==========================================================================
       2. SCROLL SPY & STATE MONITOR
       ========================================================================== */
    let lastKnownScrollPosition = 0;
    let ticking = false;
    let cpuSpikeTimeout = null;

    // Simulate CPU usage based on scroll activity
    function triggerCpuSpike() {
        const spike = Math.floor(Math.random() * 40) + 30; // Spike up to 30%-70%
        cpuFill.style.width = `${spike}%`;
        cpuPercent.textContent = `${spike}%`;

        if (cpuSpikeTimeout) clearTimeout(cpuSpikeTimeout);

        cpuSpikeTimeout = setTimeout(() => {
            const idle = Math.floor(Math.random() * 8) + 8; // Settle to 8%-16%
            cpuFill.style.width = `${idle}%`;
            cpuPercent.textContent = `${idle}%`;
        }, 300);
    }

    // Scroll Handler
    scroller.addEventListener('scroll', () => {
        lastKnownScrollPosition = scroller.scrollTop;
        if (!ticking) {
            window.requestAnimationFrame(() => {
                // Update scroll offset watch value
                scrollOffsetVal.textContent = `${lastKnownScrollPosition}px`;
                triggerCpuSpike();
                
                // Track active section
                let currentSection = 'hero';
                sections.forEach(section => {
                    const rect = section.getBoundingClientRect();
                    const parentRect = scroller.getBoundingClientRect();
                    // Section is active if its top is in the upper half of the scroller frame
                    if (rect.top - parentRect.top <= parentRect.height * 0.4) {
                        currentSection = section.id;
                    }
                });

                updateActiveNavigation(currentSection);
                ticking = false;
            });
            ticking = true;
        }
    });

    // Sync File Explorer, Tabs, and Watches
    function updateActiveNavigation(sectionId) {
        // Find corresponding file item & tab item
        const targetFile = document.getElementById(`file-${sectionId}`);
        const targetTab = document.getElementById(`tab-${sectionId}`);
        const activeSection = document.getElementById(sectionId);
        
        if (!targetFile || !targetTab || !activeSection) return;

        // Clear active classes
        fileItems.forEach(item => item.classList.remove('active'));
        tabItems.forEach(item => item.classList.remove('active'));

        // Set active classes
        targetFile.classList.add('active');
        targetTab.classList.add('active');

        // Update Watches
        const fileName = activeSection.getAttribute('data-file');
        if (fileName && watchCurrentFile.textContent !== `"${fileName}"`) {
            watchCurrentFile.textContent = `"${fileName}"`;
            
            // Map section IDs to standard frame offsets
            let frameNum = '#0';
            if (sectionId === 'skills') frameNum = '#1';
            else if (sectionId === 'projects') frameNum = '#2';
            else if (sectionId === 'cp') frameNum = '#3';
            else if (sectionId === 'timeline') frameNum = '#4';
            else if (sectionId === 'certifications') frameNum = '#5';
            else if (sectionId === 'contact') frameNum = '#6';
            
            watchStackFrame.textContent = frameNum;
            
            // Console Message Sync
            footerMsg.textContent = `Scrolled thread pointer: frame ${frameNum} (${fileName})`;
        }
    }

    // Connect Left Explorer and Header Tabs clicking behavior
    const navElements = [...fileItems, ...tabItems];
    navElements.forEach(elem => {
        elem.addEventListener('click', (e) => {
            const targetId = elem.getAttribute('data-target');
            const targetSec = document.getElementById(targetId);
            if (targetSec) {
                // Prevent default anchor jumping to maintain custom scroll viewport
                e.preventDefault();
                targetSec.scrollIntoView({ behavior: 'smooth' });
                footerMsg.textContent = `Executing compiler instruction: jump_to(${targetId})`;
            }
        });
    });

    /* ==========================================================================
       3. SKILLS HOVER DEPENDENCY & CONTEXT INSPECTOR
       ========================================================================== */
    const skillChips = document.querySelectorAll('.skill-chip');

    skillChips.forEach(chip => {
        chip.addEventListener('mouseenter', () => {
            const depsStr = chip.getAttribute('data-deps') || '';
            const description = chip.getAttribute('data-desc') || '';
            const chipName = chip.textContent.trim();
            const category = chip.parentElement.getAttribute('data-category') || 'General';

            // Active Focus
            chip.classList.add('active-focus');

            // Highlight dependency lines
            if (depsStr) {
                const deps = depsStr.split(',');
                deps.forEach(depId => {
                    const depChip = document.getElementById(depId.trim());
                    if (depChip) depChip.classList.add('dep-highlight');
                });
            }

            // Dump to Context Inspector
            inspectorIdleText.classList.add('hidden');
            inspectorDataBox.classList.remove('hidden');
            
            insItemTitle.textContent = chipName;
            insItemMeta.textContent = `class: LOADED_MODULE | cat: ${category}`;
            insItemDesc.textContent = description;

            // Footer Log
            footerMsg.textContent = `[INSPECT] Loaded dependency metadata for stack: ${chipName}`;
        });

        chip.addEventListener('mouseleave', () => {
            const depsStr = chip.getAttribute('data-deps') || '';
            
            chip.classList.remove('active-focus');

            if (depsStr) {
                const deps = depsStr.split(',');
                deps.forEach(depId => {
                    const depChip = document.getElementById(depId.trim());
                    if (depChip) depChip.classList.remove('dep-highlight');
                });
            }

            // Revert Context Inspector
            inspectorIdleText.classList.remove('hidden');
            inspectorDataBox.classList.add('hidden');
        });
    });

    /* ==========================================================================
       4. PROJECTS INSPECTOR DUMP
       ========================================================================== */
    const projectCards = document.querySelectorAll('.project-card');

    projectCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            const title = card.getAttribute('data-title') || '';
            const tech = card.getAttribute('data-tech') || '';
            const complexity = card.getAttribute('data-complexity') || '';
            const description = card.querySelector('.project-desc').textContent.trim();

            // Dump details
            inspectorIdleText.classList.add('hidden');
            inspectorDataBox.classList.remove('hidden');
            
            insItemTitle.textContent = title;
            insItemMeta.textContent = `struct: BINARY_EXEC | lang: ${tech}`;
            insItemDesc.textContent = `${description} Complexity: ${complexity}.`;

            // Footer log
            footerMsg.textContent = `[INSPECT] Object binary inspection: ${title}`;
        });

        card.addEventListener('mouseleave', () => {
            inspectorIdleText.classList.remove('hidden');
            inspectorDataBox.classList.add('hidden');
        });
    });

    /* ==========================================================================
       5. SIMULATED SYSTEM CONSOLE (TERMINAL)
       ========================================================================== */
    function writeToStdout(commandText, outputHTML) {
        const rowCmd = document.createElement('div');
        rowCmd.className = 'stdout-row';
        rowCmd.innerHTML = `<span class="terminal-prompt">moinul@nwu-os:~$</span> ${commandText}`;

        const rowResp = document.createElement('div');
        rowResp.className = 'stdout-row response';
        rowResp.innerHTML = outputHTML;

        terminalStdout.appendChild(rowCmd);
        terminalStdout.appendChild(rowResp);
        
        // Scroll terminal to bottom
        terminalStdout.scrollTop = terminalStdout.scrollHeight;
    }

    function executeCommand(commandStr) {
        const trimmed = commandStr.trim().toLowerCase();
        let responseHTML = '';

        if (!trimmed) return;

        // Command Router
        switch (trimmed) {
            case 'help':
            case './help_commands.sh':
                responseHTML = `Available system routines to run:<br>
                - <button class="term-link-btn" data-cmd="contact_details">./contact_details.sh</button> : Prints channels of communication<br>
                - <button class="term-link-btn" data-cmd="download_resume">./download_resume.sh</button>  : Resolves PDF file fetch<br>
                - <button class="term-link-btn" data-cmd="clear">clear</button>                  : Wipes terminal output logs`;
                writeToStdout(commandStr, responseHTML);
                break;
            
            case 'contact_details':
            case './contact_details.sh':
                responseHTML = `<strong>Resolved Channels:</strong><br>
                - Email: <a href="mailto:moinulislam159632@gmail.com" target="_blank" rel="noopener noreferrer">moinulislam159632@gmail.com</a><br>
                - Phone: (+880)1997919196<br>
                - GitHub 1: <a href="https://github.com/moinalmurtaza" target="_blank" rel="noopener noreferrer">github.com/moinalmurtaza</a><br>
                - GitHub 2: <a href="https://github.com/moi-nulislam" target="_blank" rel="noopener noreferrer">github.com/moi-nulislam</a><br>
                - LinkedIn: <a href="https://www.linkedin.com/in/moinul-islam-6ab888290" target="_blank" rel="noopener noreferrer">linkedin.com/in/moinul-islam-6ab888290</a><br>
                - X (Twitter): <a href="https://x.com/moinulislam_07" target="_blank" rel="noopener noreferrer">x.com/moinulislam_07</a><br>
                - Facebook: <a href="https://facebook.com/moinalmurtza" target="_blank" rel="noopener noreferrer">facebook.com/moinalmurtza</a><br>
                - Codeforces: <a href="https://codeforces.com/profile/moi.nulislam" target="_blank" rel="noopener noreferrer">codeforces.com/profile/moi.nulislam</a><br>
                - LeetCode: <a href="https://leetcode.com/u/moinalmurtaza/" target="_blank" rel="noopener noreferrer">leetcode.com/u/moinalmurtaza</a>`;
                writeToStdout(commandStr, responseHTML);
                break;

            case 'download_resume':
            case './download_resume.sh':
                responseHTML = `Connecting to static CDN storage...<br>
                [.....] 20% fetched<br>
                [..........] 60% fetched<br>
                [...............] 100% complete.<br>
                <span class="log-success">[SUCCESS]</span> File compiled: <a href="https://docs.google.com/document/d/1xYbGYa1ABki_zuhVrAGirHQoH9J2ErJ7BX2DTN6-2CE/edit?usp=sharing" target="_blank" rel="noopener noreferrer">moinul_islam_resume.pdf</a>`;
                writeToStdout(commandStr, responseHTML);
                break;

            case 'clear':
                terminalStdout.innerHTML = '';
                break;

            default:
                responseHTML = `<span class="log-error">bash: command not found: ${trimmed}</span>. Type <button class="term-link-btn" data-cmd="help">./help_commands.sh</button> for instructions.`;
                writeToStdout(commandStr, responseHTML);
                break;
        }

        // Re-bind click event on newly generated terminal buttons
        bindTerminalButtons();
    }

    // Input Execution Binding
    terminalStdin.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const cmd = terminalStdin.value;
            executeCommand(cmd);
            terminalStdin.value = '';
        }
    });

    // Handle Quick Command Clicks
    function bindTerminalButtons() {
        const freshButtons = terminalStdout.querySelectorAll('.term-link-btn');
        const allButtons = [...termButtons, ...freshButtons];
        
        allButtons.forEach(btn => {
            // Remove listener if already attached (prevent double execution)
            btn.onclick = null;
            btn.onclick = () => {
                const cmd = btn.getAttribute('data-cmd');
                let executeString = `./${cmd}.sh`;
                if (cmd === 'clear') executeString = 'clear';
                executeCommand(executeString);
            };
        });
    }

    bindTerminalButtons();

    /* ==========================================================================
       6. ACCESSIBILITY & CONTEXT UTILITIES
       ========================================================================== */
    // Update cursor line-col metrics based on pointer coordinates
    scroller.addEventListener('mousemove', (e) => {
        const bounds = scroller.getBoundingClientRect();
        // Translate cursor positioning relative to canvas coordinates
        const xCoord = Math.min(80, Math.floor((e.clientX - bounds.left) / 10));
        const yCoord = Math.min(250, Math.floor((scroller.scrollTop + (e.clientY - bounds.top)) / 24) + 1);
        cursorPosLabel.textContent = `Ln ${yCoord}, Col ${xCoord}`;
    });

    // Copy JSON Helper
    const copyJsonBtn = document.getElementById('btn-copy-json');
    copyJsonBtn.addEventListener('click', () => {
        const copyText = `{
  "name": "Moinul Islam",
  "education": "B.Sc. in CSE, North Western University, Khulna",
  "focus_areas": [
    "Competitive Programming",
    "Data Structures & Algorithms",
    "Frontend Development",
    "Mobile Application Engineering"
  ],
  "email": "moinulislam159632@gmail.com",
  "phone": "(+880)1997919196"
}`;
        navigator.clipboard.writeText(copyText).then(() => {
            copyJsonBtn.textContent = 'copied!';
            setTimeout(() => { copyJsonBtn.textContent = 'copy'; }, 1500);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    });
});
