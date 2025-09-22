class BusinessReportApp {
    constructor() {
        this.data = {
            customers: [],
            tasks: [],
            reports: []
        };
        this.currentReport = {
            id: '',
            resultDate: '',
            planDate: '',
            results: [],
            plans: []
        };
        this.selectedIndex = -1;
        this.currentAutocompleteInput = null;
        
        this.init();
    }

    init() {
        this.loadData();
        this.setupEventListeners();
        this.setDefaultDates();
        this.loadLastSession();
        this.updatePreview();
        this.initTheme();
        this.updateCurrentDate();
        this.startRealTimeUpdate();
        this.updateSortButtonStates();
        this.updateHistoryList();
        this.updateHistoryDisplay();
    }

    // データの読み込み
    loadData() {
        const savedData = localStorage.getItem('businessReportData');
        if (savedData) {
            this.data = JSON.parse(savedData);
        }
    }

    // データの保存
    saveData() {
        localStorage.setItem('businessReportData', JSON.stringify(this.data));
    }

    // デフォルト日付設定
    setDefaultDates() {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        document.getElementById('resultDate').value = this.formatDate(yesterday);
        document.getElementById('planDate').value = this.formatDate(today);
    }

    // 日付フォーマット
    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    // イベントリスナー設定
    setupEventListeners() {
        // 日付変更
        document.getElementById('resultDate').addEventListener('change', () => {
            this.updatePreview();
            this.saveCurrentSession();
        });
        document.getElementById('planDate').addEventListener('change', () => {
            this.updatePreview();
            this.saveCurrentSession();
        });

        // 顧客・プロジェクト追加ボタン
        document.getElementById('addResultBtn').addEventListener('click', () => {
            this.addItemGroup('resultsContainer');
        });
        document.getElementById('addPlanBtn').addEventListener('click', () => {
            this.addItemGroup('plansContainer');
        });

        // コピー・保存・次の日へボタン
        document.getElementById('copyBtn').addEventListener('click', () => this.copyToClipboard());
        document.getElementById('saveBtn').addEventListener('click', () => this.saveReport());
        document.getElementById('nextDayBtn').addEventListener('click', () => this.moveToNextDay());

        // クリアボタン
        document.getElementById('clearBtn').addEventListener('click', () => this.clearForm());

        // 設定管理ボタン
        document.getElementById('editSettingsBtn').addEventListener('click', () => this.showSettingsEditor());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportData());
        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });
        document.getElementById('importFile').addEventListener('change', (e) => this.importData(e));
        
        // 設定編集ボタン
        document.getElementById('saveSettingsBtn').addEventListener('click', () => this.saveSettings());
        document.getElementById('closeModalBtn').addEventListener('click', () => this.hideSettingsEditor());
        
        // テーマ切り替えボタン
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());

        // 過去レポート関連
        document.getElementById('loadHistoryBtn').addEventListener('click', () => this.loadHistory());
        document.getElementById('downloadHistoryBtn').addEventListener('click', () => this.downloadHistory());
        document.getElementById('deleteHistoryBtn').addEventListener('click', () => this.deleteHistory());

        // 過去レポート選択時の表示更新
        document.getElementById('historySelect').addEventListener('change', () => this.updateHistoryDisplay());

        // カレンダー関連
        document.getElementById('currentDate').addEventListener('click', () => this.showCalendar());
        document.getElementById('closeCalendarBtn').addEventListener('click', () => this.hideCalendar());
        document.getElementById('calendarModal').addEventListener('click', (e) => {
            if (e.target.id === 'calendarModal') this.hideCalendar();
        });
        document.getElementById('prevMonth').addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('nextMonth').addEventListener('click', () => this.changeMonth(1));

        // 初期の入力フィールドにイベントを追加
        this.setupInputEvents();
    }

    // 入力フィールドのイベント設定（イベント委譲を使用）
    setupInputEvents() {
        const containers = ['resultsContainer', 'plansContainer'];
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            
            // イベント委譲で削除ボタンのクリックを処理
            container.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-item')) {
                    this.deleteItem(e.target);
                } else if (e.target.classList.contains('move-to-plan') || e.target.classList.contains('move-to-result')) {
                    this.moveItem(e.target);
                } else if (e.target.classList.contains('move-up-project')) {
                    this.moveProject(e.target, 'up');
                } else if (e.target.classList.contains('move-down-project')) {
                    this.moveProject(e.target, 'down');
                } else if (e.target.classList.contains('delete-task')) {
                    this.deleteTask(e.target);
                } else if (e.target.classList.contains('move-task-to-plan') || e.target.classList.contains('move-task-to-result')) {
                    this.moveTask(e.target);
                } else if (e.target.classList.contains('copy-to-plan')) {
                    this.copyItemToPlan(e.target);
                } else if (e.target.classList.contains('copy-task-to-plan')) {
                    this.copyTaskToPlan(e.target);
                } else if (e.target.classList.contains('move-up-task')) {
                    this.moveTaskOrder(e.target, 'up');
                } else if (e.target.classList.contains('move-down-task')) {
                    this.moveTaskOrder(e.target, 'down');
                } else if (e.target.classList.contains('add-task-btn')) {
                    this.addTaskInput(e.target);
                }
            });
            
            // イベント委譲で入力フィールドのイベントを処理
            container.addEventListener('input', (e) => {
                if (e.target.classList.contains('customer-input')) {
                    this.handleCustomerInput(e);
                    this.updatePreview();
                } else if (e.target.classList.contains('task-input-main')) {
                    this.handleTaskInput(e);
                    this.updatePreview();
                } else if (e.target.classList.contains('task-input-sub')) {
                    this.updatePreview();
                }
            });
            
            // イベント委譲でフォーカスイベントを処理
            container.addEventListener('focus', (e) => {
                if (e.target.classList.contains('customer-input')) {
                    this.handleCustomerFocus(e);
                } else if (e.target.classList.contains('task-input-main')) {
                    this.handleTaskFocus(e);
                }
            }, true);
            
            // イベント委譲でキーダウンイベントを処理
            container.addEventListener('keydown', (e) => {
                if (e.target.classList.contains('customer-input') || e.target.classList.contains('task-input-main')) {
                    this.handleKeydown(e);
                }
            });
            
            // イベント委譲でブラーイベントを処理
            container.addEventListener('blur', (e) => {
                if (e.target.classList.contains('customer-input') || e.target.classList.contains('task-input-main')) {
                    this.hideAutocomplete(e.target);
                    // 入力内容変更時にセッション保存
                    this.saveCurrentSession();
                }
            }, true);
            
            // イベント委譲で詳細入力の変更を処理
            container.addEventListener('blur', (e) => {
                if (e.target.classList.contains('task-input-sub')) {
                    // 詳細入力変更時にもセッション保存
                    this.saveCurrentSession();
                }
            }, true);
        });
    }


    // 個別アイテムグループのイベント設定（イベント委譲を使用するため不要だが、動的生成時の互換性のため残す）
    setupItemGroupEvents(itemGroup) {
        // イベント委譲を使用しているため、ここでは何もしない
        // この関数は動的に生成された要素との互換性のために残されている
    }

    // アイテムグループ追加
    addItemGroup(containerId) {
        const container = document.getElementById(containerId);
        const itemGroup = document.createElement('div');
        itemGroup.className = 'item-group';
        const isResult = containerId === 'resultsContainer';
        itemGroup.innerHTML = `
            <div class="item-controls">
                <button type="button" class="btn btn-icon move-up-project" title="上に移動">↑</button>
                <button type="button" class="btn btn-icon move-down-project" title="下に移動">↓</button>
                <button type="button" class="btn btn-icon ${isResult ? 'move-to-plan' : 'move-to-result'}" title="${isResult ? '予定に移動' : '実績に移動'}">${isResult ? '→' : '←'}</button>
                ${isResult ? '<button type="button" class="btn btn-icon copy-to-plan" title="予定に複写">⊃</button>' : ''}
                <button type="button" class="btn btn-icon delete-item" title="削除">×</button>
            </div>
            <div class="customer-input-wrapper">
                <input type="text" class="customer-input" placeholder="顧客・プロジェクト名">
                <div class="autocomplete-list"></div>
            </div>
            <div class="tasks-container">
                <div class="task-input-wrapper">
                    <div class="task-inputs">
                        <input type="text" class="task-input-main" placeholder="${isResult ? '実施' : '予定'}項目">
                        <input type="text" class="task-input-sub" placeholder="(詳細)">
                        <button type="button" class="btn btn-icon move-up-task" title="上に移動">↑</button>
                        <button type="button" class="btn btn-icon move-down-task" title="下に移動">↓</button>
                        <button type="button" class="btn btn-icon ${isResult ? 'move-task-to-plan' : 'move-task-to-result'}" title="${isResult ? '予定に移動' : '実績に移動'}">${isResult ? '→' : '←'}</button>
                        ${isResult ? '<button type="button" class="btn btn-icon copy-task-to-plan" title="予定に複写">⊃</button>' : ''}
                        <button type="button" class="btn btn-icon delete-task" title="項目削除">×</button>
                    </div>
                    <div class="autocomplete-list"></div>
                </div>
            </div>
            <button type="button" class="btn btn-small add-task-btn">項目追加</button>
        `;
        
        container.appendChild(itemGroup);
        this.setupItemGroupEvents(itemGroup);
        this.updateSortButtonStates();
    }

    // タスク入力フィールド追加
    addTaskInput(addBtn) {
        const itemGroup = addBtn.closest('.item-group');
        const tasksContainer = itemGroup.querySelector('.tasks-container');
        const container = itemGroup.closest('.items-container');
        const isResult = container.id === 'resultsContainer';
        
        const taskWrapper = document.createElement('div');
        taskWrapper.className = 'task-input-wrapper';
        
        taskWrapper.innerHTML = `
            <div class="task-inputs">
                <input type="text" class="task-input-main" placeholder="項目">
                <input type="text" class="task-input-sub" placeholder="(詳細)">
                <button type="button" class="btn btn-icon move-up-task" title="上に移動">↑</button>
                <button type="button" class="btn btn-icon move-down-task" title="下に移動">↓</button>
                <button type="button" class="btn btn-icon ${isResult ? 'move-task-to-plan' : 'move-task-to-result'}" title="${isResult ? '予定に移動' : '実績に移動'}">${isResult ? '→' : '←'}</button>
                ${isResult ? '<button type="button" class="btn btn-icon copy-task-to-plan" title="予定に複写">⊃</button>' : ''}
                <button type="button" class="btn btn-icon delete-task" title="項目削除">×</button>
            </div>
            <div class="autocomplete-list"></div>
        `;
        
        tasksContainer.appendChild(taskWrapper);
        
        // イベント委譲により自動的にイベントが処理されるため、個別設定は不要
        const newMainInput = taskWrapper.querySelector('.task-input-main');
        newMainInput.focus();
        this.updateSortButtonStates();
    }

    // 顧客フォーカス処理
    handleCustomerFocus(e) {
        const input = e.target;
        if (!input.value.trim()) {
            // 入力が空の場合、選択時刻順で最新10件を表示
            const recent = this.data.customers
                .sort((a, b) => {
                    const aSelectedAt = new Date(a.selectedAt || a.lastUsed);
                    const bSelectedAt = new Date(b.selectedAt || b.lastUsed);
                    return bSelectedAt - aSelectedAt;
                })
                .slice(0, 10);
            
            this.showAutocomplete(input, recent.map(m => m.name));
        }
    }

    // 顧客入力処理
    handleCustomerInput(e) {
        const input = e.target;
        const value = input.value.toLowerCase();
        
        if (value.length > 0) {
            const matches = this.data.customers
                .filter(customer => customer.name.toLowerCase().includes(value))
                .sort((a, b) => {
                    // 使用回数順、次に選択時刻順
                    if (b.useCount !== a.useCount) {
                        return b.useCount - a.useCount;
                    }
                    const aSelectedAt = new Date(a.selectedAt || a.lastUsed);
                    const bSelectedAt = new Date(b.selectedAt || b.lastUsed);
                    return bSelectedAt - aSelectedAt;
                })
                .slice(0, 10);
            
            this.showAutocomplete(input, matches.map(m => m.name));
        } else {
            this.hideAutocomplete(input);
        }
    }

    // タスクフォーカス処理
    handleTaskFocus(e) {
        const input = e.target;
        if (!input.value.trim()) {
            // 入力が空の場合、選択時刻順で最新10件を表示
            const recent = this.data.tasks
                .sort((a, b) => {
                    const aSelectedAt = new Date(a.selectedAt || a.lastUsed);
                    const bSelectedAt = new Date(b.selectedAt || b.lastUsed);
                    return bSelectedAt - aSelectedAt;
                })
                .slice(0, 10);
            
            this.showAutocomplete(input, recent.map(m => m.text));
        }
    }

    // タスク入力処理
    handleTaskInput(e) {
        const input = e.target;
        const value = input.value.toLowerCase();
        
        if (value.length > 0) {
            const matches = this.data.tasks
                .filter(task => task.text.toLowerCase().includes(value))
                .sort((a, b) => {
                    if (b.useCount !== a.useCount) {
                        return b.useCount - a.useCount;
                    }
                    const aSelectedAt = new Date(a.selectedAt || a.lastUsed);
                    const bSelectedAt = new Date(b.selectedAt || b.lastUsed);
                    return bSelectedAt - aSelectedAt;
                })
                .slice(0, 10);
            
            this.showAutocomplete(input, matches.map(m => m.text));
        } else {
            this.hideAutocomplete(input);
        }
    }

    // キーボード操作処理
    handleKeydown(e) {
        const input = e.target;
        // タスク入力の場合は.task-input-wrapper、顧客入力の場合は.customer-input-wrapper
        const wrapper = input.closest('.task-input-wrapper') || input.closest('.customer-input-wrapper');
        const list = wrapper.querySelector('.autocomplete-list');
        
        if (list.style.display === 'none' || list.children.length === 0) {
            return;
        }
        
        const items = Array.from(list.children);
        
        // Ctrl+N または 下矢印
        if ((e.ctrlKey && e.key === 'n') || e.key === 'ArrowDown') {
            e.preventDefault();
            this.selectedIndex = Math.min(this.selectedIndex + 1, items.length - 1);
            this.updateSelection(items);
            this.currentAutocompleteInput = input;
        }
        // Ctrl+P または 上矢印
        else if ((e.ctrlKey && e.key === 'p') || e.key === 'ArrowUp') {
            e.preventDefault();
            this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
            this.updateSelection(items);
            this.currentAutocompleteInput = input;
        }
        // Enter
        else if (e.key === 'Enter' && this.selectedIndex >= 0) {
            e.preventDefault();
            const selectedItem = items[this.selectedIndex];
            if (selectedItem) {
                input.value = selectedItem.textContent;
                this.updateSelectionTime(input, selectedItem.textContent);
                this.hideAutocomplete(input);
                this.updatePreview();
            }
        }
        // Escape
        else if (e.key === 'Escape') {
            e.preventDefault();
            this.hideAutocomplete(input);
        }
    }

    // 選択状態の更新
    updateSelection(items) {
        items.forEach((item, index) => {
            if (index === this.selectedIndex) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }

    // オートコンプリート表示
    showAutocomplete(input, items) {
        const wrapper = input.closest('.task-input-wrapper') || input.closest('.customer-input-wrapper');
        const list = wrapper.querySelector('.autocomplete-list');
        
        if (items.length === 0) {
            list.style.display = 'none';
            this.selectedIndex = -1;
            return;
        }
        
        list.innerHTML = '';
        this.selectedIndex = -1;
        this.currentAutocompleteInput = input;
        
        items.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'autocomplete-item';
            div.textContent = item;
            div.addEventListener('mousedown', (e) => {
                e.preventDefault();
                input.value = item;
                this.updateSelectionTime(input, item);
                this.hideAutocomplete(input);
                this.updatePreview();
            });
            div.addEventListener('mouseenter', () => {
                this.selectedIndex = index;
                this.updateSelection(Array.from(list.children));
            });
            list.appendChild(div);
        });
        
        list.style.display = 'block';
    }

    // 選択時刻更新
    updateSelectionTime(input, selectedValue) {
        const now = new Date().toISOString();
        
        // 顧客入力の場合
        if (input.classList.contains('customer-input')) {
            const customer = this.data.customers.find(c => c.name === selectedValue);
            if (customer) {
                customer.selectedAt = now;
            }
        }
        // タスク入力の場合
        else if (input.classList.contains('task-input-main')) {
            const task = this.data.tasks.find(t => t.text === selectedValue);
            if (task) {
                task.selectedAt = now;
            }
        }
        
        // データを保存
        this.saveData();
    }

    // オートコンプリート非表示
    hideAutocomplete(input) {
        setTimeout(() => {
            const wrapper = input.closest('.task-input-wrapper') || input.closest('.customer-input-wrapper');
            const list = wrapper.querySelector('.autocomplete-list');
            list.style.display = 'none';
            this.selectedIndex = -1;
            this.currentAutocompleteInput = null;
        }, 150);
    }

    // プレビュー更新
    updatePreview() {
        const resultDate = document.getElementById('resultDate').value;
        const planDate = document.getElementById('planDate').value;
        
        if (!resultDate || !planDate) return;
        
        const results = this.getInputData('resultsContainer');
        const plans = this.getInputData('plansContainer');
        
        const markdown = this.generateMarkdown(resultDate, planDate, results, plans);
        document.getElementById('markdownPreview').textContent = markdown;
    }

    // 入力データ取得
    getInputData(containerId) {
        const container = document.getElementById(containerId);
        const itemGroups = container.querySelectorAll('.item-group');
        const data = [];
        
        itemGroups.forEach(group => {
            const customerInput = group.querySelector('.customer-input');
            const taskWrappers = group.querySelectorAll('.task-input-wrapper');
            
            const customer = customerInput.value.trim();
            if (!customer) return;
            
            const tasks = Array.from(taskWrappers)
                .map(wrapper => {
                    const mainInput = wrapper.querySelector('.task-input-main');
                    const subInput = wrapper.querySelector('.task-input-sub');
                    const main = mainInput ? mainInput.value.trim() : '';
                    const sub = subInput ? subInput.value.trim() : '';
                    
                    if (!main) return null;
                    
                    // 括弧内の内容がある場合のみ括弧を追加
                    return sub ? `${main}(${sub})` : main;
                })
                .filter(task => task);
            
            if (tasks.length > 0) {
                data.push({ customer, tasks });
            }
        });
        
        return data;
    }

    // マークダウン生成
    generateMarkdown(resultDate, planDate, results, plans) {
        let markdown = '';
        
        // 実績セクション
        if (results.length > 0) {
            const formattedResultDate = this.formatDisplayDate(resultDate);
            markdown += `- ${formattedResultDate}実績\n`;
            results.forEach(result => {
                markdown += `    - ${result.customer}\n`;
                result.tasks.forEach(task => {
                    markdown += `        - ${task}\n`;
                });
            });
            markdown += '\n';
        }
        
        // 予定セクション
        if (plans.length > 0) {
            const formattedPlanDate = this.formatDisplayDate(planDate);
            markdown += `- ${formattedPlanDate}以降の予定\n`;
            plans.forEach(plan => {
                markdown += `    - ${plan.customer}\n`;
                plan.tasks.forEach(task => {
                    markdown += `        - ${task}\n`;
                });
            });
        }
        
        return markdown;
    }

    // 表示用日付フォーマット
    formatDisplayDate(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}/${month}/${day}`;
    }

    // クリップボードにコピー
    async copyToClipboard() {
        const markdown = document.getElementById('markdownPreview').textContent;
        if (!markdown.trim()) {
            this.showToast('生成するレポートがありません。', 'warning');
            return;
        }
        
        try {
            await navigator.clipboard.writeText(markdown);
            this.showToast('レポートをクリップボードにコピーしました。', 'success');
        } catch (err) {
            this.showToast('クリップボードへのコピーに失敗しました。', 'error');
        }
    }

    // レポート保存
    saveReport() {
        const markdown = document.getElementById('markdownPreview').textContent;
        if (!markdown.trim()) {
            this.showToast('保存するレポートがありません。', 'warning');
            return;
        }
        
        // データ保存
        this.saveCurrentReport(markdown);
        this.updateUsageStats();
        this.saveData();
        this.saveCurrentSession();
        this.updateHistoryList();
        this.updateHistoryDisplay();

        this.showToast('レポートを保存しました。', 'success');
    }

    // 次の日へ進む
    moveToNextDay() {
        // 予定を実績に複写
        this.copyPlansToResults();
        this.showToast('予定を実績に複写し、日付を更新しました。', 'success');
    }

    // 現在のレポート保存
    saveCurrentReport(markdown) {
        const resultDate = document.getElementById('resultDate').value;
        const planDate = document.getElementById('planDate').value;
        const results = this.getInputData('resultsContainer');
        const plans = this.getInputData('plansContainer');
        
        const report = {
            id: resultDate,
            resultDate,
            planDate,
            results,
            plans,
            markdown,
            created: new Date().toISOString()
        };
        
        // 既存レポートを更新または新規追加
        const existingIndex = this.data.reports.findIndex(r => r.id === report.id);
        if (existingIndex !== -1) {
            this.data.reports[existingIndex] = report;
        } else {
            this.data.reports.push(report);
        }
        
        // 日付順でソート（新しい順）
        this.data.reports.sort((a, b) => new Date(b.resultDate) - new Date(a.resultDate));
    }

    // 使用統計更新
    updateUsageStats() {
        const now = new Date().toISOString();
        const results = this.getInputData('resultsContainer');
        const plans = this.getInputData('plansContainer');
        
        // 顧客データ更新
        [...results, ...plans].forEach(item => {
            let customer = this.data.customers.find(c => c.name === item.customer);
            if (!customer) {
                customer = { name: item.customer, useCount: 0, lastUsed: now, selectedAt: now };
                this.data.customers.push(customer);
            }
            customer.useCount++;
            customer.lastUsed = now;
        });
        
        // タスクデータ更新（詳細部分を除外してメイン部分のみ保存）
        [...results, ...plans].forEach(item => {
            item.tasks.forEach(taskText => {
                // 括弧内の詳細を除去してメイン部分のみを取得
                const mainTaskText = taskText.replace(/\s*\([^)]*\)$/, '').trim();
                
                if (!mainTaskText) return; // メイン部分が空の場合はスキップ
                
                let task = this.data.tasks.find(t => t.text === mainTaskText);
                if (!task) {
                    task = { text: mainTaskText, useCount: 0, lastUsed: now, selectedAt: now };
                    this.data.tasks.push(task);
                }
                task.useCount++;
                task.lastUsed = now;
            });
        });
    }

    // フォームクリア
    clearForm() {
        if (confirm('入力内容をクリアしますか？')) {
            // セッション削除
            localStorage.removeItem('lastSession');
            
            // 実績・予定コンテナをリセット
            ['resultsContainer', 'plansContainer'].forEach(containerId => {
                const container = document.getElementById(containerId);
                const isResult = containerId === 'resultsContainer';
                container.innerHTML = `
                    <div class="item-group">
                        <div class="item-controls">
                            <button type="button" class="btn btn-icon move-up-project" title="上に移動">↑</button>
                            <button type="button" class="btn btn-icon move-down-project" title="下に移動">↓</button>
                            <button type="button" class="btn btn-icon ${isResult ? 'move-to-plan' : 'move-to-result'}" title="${isResult ? '予定に移動' : '実績に移動'}">${isResult ? '→' : '←'}</button>
                            <button type="button" class="btn btn-icon delete-item" title="削除">×</button>
                        </div>
                        <div class="customer-input-wrapper">
                            <input type="text" class="customer-input" placeholder="顧客・プロジェクト名">
                            <div class="autocomplete-list"></div>
                        </div>
                        <div class="tasks-container">
                            <div class="task-input-wrapper">
                                <div class="task-inputs">
                                    <input type="text" class="task-input-main" placeholder="${isResult ? '実施' : '予定'}項目">
                                    <input type="text" class="task-input-sub" placeholder="(詳細)">
                                    <button type="button" class="btn btn-icon move-up-task" title="上に移動">↑</button>
                                    <button type="button" class="btn btn-icon move-down-task" title="下に移動">↓</button>
                                    <button type="button" class="btn btn-icon ${isResult ? 'move-task-to-plan' : 'move-task-to-result'}" title="${isResult ? '予定に移動' : '実績に移動'}">${isResult ? '→' : '←'}</button>
                                    ${isResult ? '<button type="button" class="btn btn-icon copy-task-to-plan" title="予定に複写">⊃</button>' : ''}
                                    <button type="button" class="btn btn-icon delete-task" title="項目削除">×</button>
                                </div>
                                <div class="autocomplete-list"></div>
                            </div>
                        </div>
                        <button type="button" class="btn btn-small add-task-btn">項目追加</button>
                    </div>
                `;
            });
            
            this.setDefaultDates();
            this.updateSortButtonStates();
            this.updatePreview();
        }
    }

    // 過去レポートリスト更新
    updateHistoryList() {
        const select = document.getElementById('historySelect');
        select.innerHTML = '<option value="">レポートを選択...</option>';
        
        this.data.reports.forEach(report => {
            const option = document.createElement('option');
            option.value = report.id;
            option.textContent = `${this.formatDisplayDate(report.resultDate)} の報告`;
            select.appendChild(option);
        });

        // 最新のレポートを自動選択
        if (this.data.reports.length > 0) {
            select.value = this.data.reports[0].id;
        }
    }

    // 過去レポート読み込み
    loadHistory() {
        const select = document.getElementById('historySelect');
        const reportId = select.value;
        
        if (!reportId) {
            this.showToast('レポートを選択してください。', 'warning');
            return;
        }
        
        const report = this.data.reports.find(r => r.id === reportId);
        if (!report) {
            this.showToast('レポートが見つかりません。', 'error');
            return;
        }
        
        // レポートデータを読み込み
        this.loadReportData({
            resultDate: report.resultDate,
            planDate: report.planDate,
            results: report.results || [],
            plans: report.plans || []
        });
    }


    // 過去レポートダウンロード
    downloadHistory() {
        const select = document.getElementById('historySelect');
        const reportId = select.value;
        
        if (!reportId) {
            this.showToast('ダウンロードするレポートを選択してください。', 'warning');
            return;
        }
        
        const report = this.data.reports.find(r => r.id === reportId);
        if (!report) {
            this.showToast('選択されたレポートが見つかりません。', 'error');
            return;
        }
        
        // Markdownファイルとしてダウンロード
        const blob = new Blob([report.markdown], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `業務報告-${report.resultDate}.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // 過去レポート削除
    deleteHistory() {
        const select = document.getElementById('historySelect');
        const reportId = select.value;
        
        if (!reportId) {
            this.showToast('削除するレポートを選択してください。', 'warning');
            return;
        }
        
        if (confirm('選択したレポートを削除しますか？')) {
            this.data.reports = this.data.reports.filter(r => r.id !== reportId);
            this.saveData();
            this.updateHistoryList();
            this.showToast('レポートを削除しました。', 'success');
        }
    }

    // データエクスポート
    exportData() {
        const exportData = {
            settings: {
                customers: this.data.customers,
                tasks: this.data.tasks
            },
            reports: this.data.reports.map(r => r.markdown).join('\n\n---\n\n')
        };
        
        // 設定データ（JSON）
        const settingsBlob = new Blob([JSON.stringify(exportData.settings, null, 2)], 
            { type: 'application/json' });
        const settingsUrl = URL.createObjectURL(settingsBlob);
        const settingsLink = document.createElement('a');
        settingsLink.href = settingsUrl;
        settingsLink.download = `business-report-settings-${new Date().toISOString().split('T')[0]}.json`;
        settingsLink.click();
        
        // レポートデータ（Markdown）
        let reportsUrl = null;
        if (exportData.reports.trim()) {
            const reportsBlob = new Blob([exportData.reports], { type: 'text/markdown' });
            reportsUrl = URL.createObjectURL(reportsBlob);
            const reportsLink = document.createElement('a');
            reportsLink.href = reportsUrl;
            reportsLink.download = `business-reports-${new Date().toISOString().split('T')[0]}.md`;
            reportsLink.click();
        }
        
        URL.revokeObjectURL(settingsUrl);
        if (reportsUrl) {
            URL.revokeObjectURL(reportsUrl);
        }
    }

    // データインポート
    importData(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                if (file.name.endsWith('.json')) {
                    const importedData = JSON.parse(e.target.result);
                    if (importedData.customers && importedData.tasks) {
                        if (confirm('設定データをインポートしますか？既存のデータは上書きされます。')) {
                            this.data.customers = importedData.customers;
                            this.data.tasks = importedData.tasks;
                            this.saveData();
                            this.showToast('設定データをインポートしました。', 'success');
                        }
                    }
                } else if (file.name.endsWith('.md')) {
                    const markdownContent = e.target.result;
                    const parsedData = this.parseMarkdownReport(markdownContent);
                    if (parsedData) {
                        if (confirm('Markdownレポートをインポートして現在の入力内容を上書きしますか？')) {
                            this.loadReportData(parsedData);
                            this.showToast('Markdownレポートをインポートしました。', 'success');
                        }
                    } else {
                        this.showToast('Markdownファイルの形式が正しくありません。', 'error');
                    }
                } else {
                    this.showToast('対応していないファイル形式です。JSON(.json)またはMarkdown(.md)ファイルを選択してください。', 'error');
                }
            } catch (error) {
                this.showToast('ファイルの読み込みに失敗しました。', 'error');
            }
        };
        reader.readAsText(file);
        
        // ファイル選択をクリア
        e.target.value = '';
    }

    // Markdownレポート解析
    parseMarkdownReport(markdown) {
        const lines = markdown.split('\n');
        const results = [];
        const plans = [];
        let currentSection = null;
        let currentCustomer = null;
        let resultDate = null;
        let planDate = null;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            
            // インデントレベルを計算
            const indent = line.length - line.trimStart().length;
            
            // 実績セクション検出（インデントレベル0）
            if (indent === 0 && trimmed.match(/^-\s*(\d{4}\/\d{2}\/\d{2})実績/)) {
                const match = trimmed.match(/^-\s*(\d{4}\/\d{2}\/\d{2})実績/);
                resultDate = match[1].replace(/\//g, '-');
                currentSection = 'results';
                currentCustomer = null;
                continue;
            }
            
            // 予定セクション検出（インデントレベル0）
            if (indent === 0 && trimmed.match(/^-\s*(\d{4}\/\d{2}\/\d{2})以降の予定/)) {
                const match = trimmed.match(/^-\s*(\d{4}\/\d{2}\/\d{2})以降の予定/);
                planDate = match[1].replace(/\//g, '-');
                currentSection = 'plans';
                currentCustomer = null;
                continue;
            }
            
            // 顧客・プロジェクト名検出（インデントレベル4）
            if (currentSection && indent === 4 && trimmed.match(/^-\s+(.+)/)) {
                const match = trimmed.match(/^-\s+(.+)/);
                const customerName = match[1].trim();
                
                currentCustomer = {
                    customer: customerName,
                    tasks: []
                };
                
                if (currentSection === 'results') {
                    results.push(currentCustomer);
                } else if (currentSection === 'plans') {
                    plans.push(currentCustomer);
                }
                continue;
            }
            
            // タスク検出（インデントレベル8）
            if (currentCustomer && indent === 8 && trimmed.match(/^-\s+(.+)/)) {
                const match = trimmed.match(/^-\s+(.+)/);
                const taskText = match[1].trim();
                currentCustomer.tasks.push(taskText);
                continue;
            }
        }

        if (results.length === 0 && plans.length === 0) {
            return null;
        }

        return {
            resultDate: resultDate || this.formatDate(new Date()),
            planDate: planDate || this.formatDate(new Date()),
            results,
            plans
        };
    }

    // レポートデータ読み込み
    loadReportData(data) {
        // 日付設定
        if (data.resultDate) {
            document.getElementById('resultDate').value = data.resultDate;
        }
        if (data.planDate) {
            document.getElementById('planDate').value = data.planDate;
        }
        
        // 既存のコンテナをクリア
        this.clearContainers();
        
        // 実績データ読み込み
        if (data.results && data.results.length > 0) {
            const resultsContainer = document.getElementById('resultsContainer');
            resultsContainer.innerHTML = '';
            
            data.results.forEach(item => {
                this.addItemGroupWithData(resultsContainer, item, true);
            });
        }
        
        // 予定データ読み込み
        if (data.plans && data.plans.length > 0) {
            const plansContainer = document.getElementById('plansContainer');
            plansContainer.innerHTML = '';
            
            data.plans.forEach(item => {
                this.addItemGroupWithData(plansContainer, item, false);
            });
        }
        
        // プレビュー更新
        this.updatePreview();
        this.updateSortButtonStates();
    }

    // データ付きアイテムグループ追加
    addItemGroupWithData(container, data, isResult) {
        const itemGroup = document.createElement('div');
        itemGroup.className = 'item-group';
        
        itemGroup.innerHTML = `
            <div class="item-controls">
                <button type="button" class="btn btn-icon move-up-project" title="上に移動">↑</button>
                <button type="button" class="btn btn-icon move-down-project" title="下に移動">↓</button>
                <button type="button" class="btn btn-icon ${isResult ? 'move-to-plan' : 'move-to-result'}" title="${isResult ? '予定に移動' : '実績に移動'}">${isResult ? '→' : '←'}</button>
                ${isResult ? '<button type="button" class="btn btn-icon copy-to-plan" title="予定に複写">⊃</button>' : ''}
                <button type="button" class="btn btn-icon delete-item" title="削除">×</button>
            </div>
            <div class="customer-input-wrapper">
                <input type="text" class="customer-input" placeholder="顧客・プロジェクト名" value="${data.customer}">
                <div class="autocomplete-list"></div>
            </div>
            <div class="tasks-container">
            </div>
            <button type="button" class="btn btn-small add-task-btn">項目追加</button>
        `;
        
        const tasksContainer = itemGroup.querySelector('.tasks-container');
        
        // タスクデータ追加
        data.tasks.forEach(taskText => {
            const match = taskText.match(/^(.+?)\s*(\([^)]*\))?\s*$/);
            const mainText = match ? match[1].trim() : taskText;
            const subText = match && match[2] ? match[2].slice(1, -1) : '';
            
            const taskWrapper = document.createElement('div');
            taskWrapper.className = 'task-input-wrapper';
            taskWrapper.innerHTML = `
                <div class="task-inputs">
                    <input type="text" class="task-input-main" placeholder="${isResult ? '実施' : '予定'}項目" value="${mainText}">
                    <input type="text" class="task-input-sub" placeholder="(詳細)" value="${subText}">
                    <button type="button" class="btn btn-icon move-up-task" title="上に移動">↑</button>
                    <button type="button" class="btn btn-icon move-down-task" title="下に移動">↓</button>
                    <button type="button" class="btn btn-icon ${isResult ? 'move-task-to-plan' : 'move-task-to-result'}" title="${isResult ? '予定に移動' : '実績に移動'}">${isResult ? '→' : '←'}</button>
                    ${isResult ? '<button type="button" class="btn btn-icon copy-task-to-plan" title="予定に複写">⊃</button>' : ''}
                    <button type="button" class="btn btn-icon delete-task" title="項目削除">×</button>
                </div>
                <div class="autocomplete-list"></div>
            `;
            tasksContainer.appendChild(taskWrapper);
        });
        
        // タスクが空の場合はデフォルトを1つ追加
        if (data.tasks.length === 0) {
            const defaultTaskWrapper = document.createElement('div');
            defaultTaskWrapper.className = 'task-input-wrapper';
            defaultTaskWrapper.innerHTML = `
                <div class="task-inputs">
                    <input type="text" class="task-input-main" placeholder="${isResult ? '実施' : '予定'}項目">
                    <input type="text" class="task-input-sub" placeholder="(詳細)">
                    <button type="button" class="btn btn-icon move-up-task" title="上に移動">↑</button>
                    <button type="button" class="btn btn-icon move-down-task" title="下に移動">↓</button>
                    <button type="button" class="btn btn-icon ${isResult ? 'move-task-to-plan' : 'move-task-to-result'}" title="${isResult ? '予定に移動' : '実績に移動'}">${isResult ? '→' : '←'}</button>
                    ${isResult ? '<button type="button" class="btn btn-icon copy-task-to-plan" title="予定に複写">⊃</button>' : ''}
                    <button type="button" class="btn btn-icon delete-task" title="項目削除">×</button>
                </div>
                <div class="autocomplete-list"></div>
            `;
            tasksContainer.appendChild(defaultTaskWrapper);
        }
        
        container.appendChild(itemGroup);
    }

    // コンテナクリア
    clearContainers() {
        // デフォルトの空アイテムを作成
        ['resultsContainer', 'plansContainer'].forEach(containerId => {
            const container = document.getElementById(containerId);
            const isResult = containerId === 'resultsContainer';
            container.innerHTML = `
                <div class="item-group">
                    <div class="item-controls">
                        <button type="button" class="btn btn-icon move-up-project" title="上に移動">↑</button>
                        <button type="button" class="btn btn-icon move-down-project" title="下に移動">↓</button>
                        <button type="button" class="btn btn-icon ${isResult ? 'move-to-plan' : 'move-to-result'}" title="${isResult ? '予定に移動' : '実績に移動'}">${isResult ? '→' : '←'}</button>
                        <button type="button" class="btn btn-icon delete-item" title="削除">×</button>
                    </div>
                    <div class="customer-input-wrapper">
                        <input type="text" class="customer-input" placeholder="顧客・プロジェクト名">
                        <div class="autocomplete-list"></div>
                    </div>
                    <div class="tasks-container">
                        <div class="task-input-wrapper">
                            <div class="task-inputs">
                                <input type="text" class="task-input-main" placeholder="${isResult ? '実施' : '予定'}項目">
                                <input type="text" class="task-input-sub" placeholder="(詳細)">
                                <button type="button" class="btn btn-icon move-up-task" title="上に移動">↑</button>
                                <button type="button" class="btn btn-icon move-down-task" title="下に移動">↓</button>
                                <button type="button" class="btn btn-icon ${isResult ? 'move-task-to-plan' : 'move-task-to-result'}" title="${isResult ? '予定に移動' : '実績に移動'}">${isResult ? '→' : '←'}</button>
                                ${isResult ? '<button type="button" class="btn btn-icon copy-task-to-plan" title="予定に複写">⊃</button>' : ''}
                                <button type="button" class="btn btn-icon delete-task" title="項目削除">×</button>
                            </div>
                            <div class="autocomplete-list"></div>
                        </div>
                    </div>
                    <button type="button" class="btn btn-small add-task-btn">項目追加</button>
                </div>
            `;
        });
    }

    // 項目移動
    moveItem(button) {
        const itemGroup = button.closest('.item-group');
        const isMovingToPlan = button.classList.contains('move-to-plan');
        const targetContainerId = isMovingToPlan ? 'plansContainer' : 'resultsContainer';
        const targetContainer = document.getElementById(targetContainerId);
        
        // データを取得
        const customerInput = itemGroup.querySelector('.customer-input');
        const customerValue = customerInput.value;
        
        const taskWrappers = itemGroup.querySelectorAll('.task-input-wrapper');
        const taskData = Array.from(taskWrappers).map(wrapper => {
            const mainInput = wrapper.querySelector('.task-input-main');
            const subInput = wrapper.querySelector('.task-input-sub');
            return {
                main: mainInput ? mainInput.value : '',
                sub: subInput ? subInput.value : ''
            };
        }).filter(task => task.main.trim());
        
        if (!customerValue.trim() || taskData.length === 0) {
            this.showToast('移動するデータがありません。', 'warning');
            return;
        }
        
        // 新しいアイテムグループを作成
        this.addItemGroup(targetContainerId);
        const newItemGroups = targetContainer.querySelectorAll('.item-group');
        const newItemGroup = newItemGroups[newItemGroups.length - 1];
        
        // データを設定
        const newCustomerInput = newItemGroup.querySelector('.customer-input');
        newCustomerInput.value = customerValue;
        
        // イベント委譲により自動的に処理される
        
        const newTasksContainer = newItemGroup.querySelector('.tasks-container');
        newTasksContainer.innerHTML = '';
        
        taskData.forEach(task => {
            const taskWrapper = document.createElement('div');
            taskWrapper.className = 'task-input-wrapper';
            const isTargetResult = targetContainerId === 'resultsContainer';
            taskWrapper.innerHTML = `
                <div class="task-inputs">
                    <input type="text" class="task-input-main" placeholder="項目" value="${task.main}">
                    <input type="text" class="task-input-sub" placeholder="(詳細)" value="${task.sub}">
                    <button type="button" class="btn btn-icon move-up-task" title="上に移動">↑</button>
                    <button type="button" class="btn btn-icon move-down-task" title="下に移動">↓</button>
                    <button type="button" class="btn btn-icon ${isTargetResult ? 'move-task-to-plan' : 'move-task-to-result'}" title="${isTargetResult ? '予定に移動' : '実績に移動'}">${isTargetResult ? '→' : '←'}</button>
                    <button type="button" class="btn btn-icon delete-task" title="項目削除">×</button>
                </div>
                <div class="autocomplete-list"></div>
            `;
            newTasksContainer.appendChild(taskWrapper);
            
            // イベント委譲により自動的に処理される
        });
        
        // 元のアイテムを削除
        itemGroup.remove();
        
        // コントロールボタンのイベントを再設定
        this.setupItemGroupEvents(newItemGroup);
        this.updatePreview();
    }

    // 項目削除
    deleteItem(button) {
        const itemGroup = button.closest('.item-group');
        const container = itemGroup.closest('.items-container');
        
        if (confirm('この項目を削除しますか？')) {
            itemGroup.remove();
            
            // コンテナが空の場合、デフォルトのアイテムグループを追加
            if (container.children.length === 0) {
                const containerId = container.id;
                this.addItemGroup(containerId);
            }
            
            this.updateSortButtonStates();
            this.updatePreview();
        }
    }

    // タスク削除
    deleteTask(button) {
        const taskWrapper = button.closest('.task-input-wrapper');
        const tasksContainer = taskWrapper.closest('.tasks-container');
        
        if (confirm('このタスクを削除しますか？')) {
            taskWrapper.remove();
            
            // タスクが全て削除された場合、デフォルトのタスクを追加
            if (tasksContainer.children.length === 0) {
                const itemGroup = tasksContainer.closest('.item-group');
                const container = itemGroup.closest('.items-container');
                const isResult = container.id === 'resultsContainer';
                
                const taskWrapper = document.createElement('div');
                taskWrapper.className = 'task-input-wrapper';
                taskWrapper.innerHTML = `
                    <div class="task-inputs">
                        <input type="text" class="task-input-main" placeholder="${isResult ? '実施' : '予定'}項目">
                        <input type="text" class="task-input-sub" placeholder="(詳細)">
                        <button type="button" class="btn btn-icon move-up-task" title="上に移動">↑</button>
                        <button type="button" class="btn btn-icon move-down-task" title="下に移動">↓</button>
                        <button type="button" class="btn btn-icon ${isResult ? 'move-task-to-plan' : 'move-task-to-result'}" title="${isResult ? '予定に移動' : '実績に移動'}">${isResult ? '→' : '←'}</button>
                        ${isResult ? '<button type="button" class="btn btn-icon copy-task-to-plan" title="予定に複写">⊃</button>' : ''}
                        <button type="button" class="btn btn-icon delete-task" title="項目削除">×</button>
                    </div>
                    <div class="autocomplete-list"></div>
                `;
                tasksContainer.appendChild(taskWrapper);
                
                // イベント委譲により自動的に処理される
            }
            
            this.updateSortButtonStates();
            this.updatePreview();
        }
    }

    // タスク移動
    moveTask(button) {
        const taskWrapper = button.closest('.task-input-wrapper');
        const sourceItemGroup = taskWrapper.closest('.item-group');
        const sourceContainer = sourceItemGroup.closest('.items-container');
        
        // 移動先を決定
        const isMovingToPlan = button.classList.contains('move-task-to-plan');
        const targetContainerId = isMovingToPlan ? 'plansContainer' : 'resultsContainer';
        const targetContainer = document.getElementById(targetContainerId);
        
        // タスクデータを取得
        const mainInput = taskWrapper.querySelector('.task-input-main');
        const subInput = taskWrapper.querySelector('.task-input-sub');
        const mainValue = mainInput ? mainInput.value.trim() : '';
        const subValue = subInput ? subInput.value.trim() : '';
        
        if (!mainValue) {
            this.showToast('移動するタスクがありません。', 'warning');
            return;
        }
        
        // 顧客名を取得
        const sourceCustomerInput = sourceItemGroup.querySelector('.customer-input');
        const customerValue = sourceCustomerInput ? sourceCustomerInput.value.trim() : '';
        
        if (!customerValue) {
            this.showToast('顧客・プロジェクト名が入力されていません。', 'warning');
            return;
        }
        
        // 移動先で同じ顧客のアイテムグループを探す
        let targetItemGroup = null;
        const targetItemGroups = targetContainer.querySelectorAll('.item-group');
        
        for (const group of targetItemGroups) {
            const customerInput = group.querySelector('.customer-input');
            if (customerInput && customerInput.value.trim() === customerValue) {
                targetItemGroup = group;
                break;
            }
        }
        
        // 移動先に同じ顧客がない場合、新しいアイテムグループを作成
        if (!targetItemGroup) {
            this.addItemGroup(targetContainerId);
            const newGroups = targetContainer.querySelectorAll('.item-group');
            targetItemGroup = newGroups[newGroups.length - 1];
            
            // 顧客名を設定
            const targetCustomerInput = targetItemGroup.querySelector('.customer-input');
            if (targetCustomerInput) {
                targetCustomerInput.value = customerValue;
            }
            
            // 既存のデフォルトタスクを削除
            const targetTasksContainer = targetItemGroup.querySelector('.tasks-container');
            targetTasksContainer.innerHTML = '';
        }
        
        // 移動先にタスクを追加
        const targetTasksContainer = targetItemGroup.querySelector('.tasks-container');
        const newTaskWrapper = document.createElement('div');
        newTaskWrapper.className = 'task-input-wrapper';
        
        const isTargetResult = targetContainerId === 'resultsContainer';
        newTaskWrapper.innerHTML = `
            <div class="task-inputs">
                <input type="text" class="task-input-main" placeholder="${isTargetResult ? '実施' : '予定'}項目" value="${mainValue}">
                <input type="text" class="task-input-sub" placeholder="(詳細)" value="${subValue}">
                <button type="button" class="btn btn-icon move-up-task" title="上に移動">↑</button>
                <button type="button" class="btn btn-icon move-down-task" title="下に移動">↓</button>
                <button type="button" class="btn btn-icon ${isTargetResult ? 'move-task-to-plan' : 'move-task-to-result'}" title="${isTargetResult ? '予定に移動' : '実績に移動'}">${isTargetResult ? '→' : '←'}</button>
                <button type="button" class="btn btn-icon delete-task" title="項目削除">×</button>
            </div>
            <div class="autocomplete-list"></div>
        `;
        
        targetTasksContainer.appendChild(newTaskWrapper);
        
        // イベント委譲により自動的に処理される
        
        // 元のタスクを削除
        taskWrapper.remove();
        
        // 元のタスクコンテナが空になった場合、デフォルトタスクを追加
        const sourceTasksContainer = sourceItemGroup.querySelector('.tasks-container');
        if (sourceTasksContainer.children.length === 0) {
            const isSourceResult = sourceContainer.id === 'resultsContainer';
            const defaultTaskWrapper = document.createElement('div');
            defaultTaskWrapper.className = 'task-input-wrapper';
            defaultTaskWrapper.innerHTML = `
                <div class="task-inputs">
                    <input type="text" class="task-input-main" placeholder="${isSourceResult ? '実施' : '予定'}項目">
                    <input type="text" class="task-input-sub" placeholder="(詳細)">
                    <button type="button" class="btn btn-icon move-up-task" title="上に移動">↑</button>
                    <button type="button" class="btn btn-icon move-down-task" title="下に移動">↓</button>
                    <button type="button" class="btn btn-icon ${isSourceResult ? 'move-task-to-plan' : 'move-task-to-result'}" title="${isSourceResult ? '予定に移動' : '実績に移動'}">${isSourceResult ? '→' : '←'}</button>
                    ${isSourceResult ? '<button type="button" class="btn btn-icon copy-task-to-plan" title="予定に複写">⊃</button>' : ''}
                    <button type="button" class="btn btn-icon delete-task" title="項目削除">×</button>
                </div>
                <div class="autocomplete-list"></div>
            `;
            sourceTasksContainer.appendChild(defaultTaskWrapper);
            
            // イベント委譲により自動的に処理される
        }
        
        this.updatePreview();
    }

    // プロジェクト並べ替え
    moveProject(button, direction) {
        const itemGroup = button.closest('.item-group');
        const container = itemGroup.closest('.items-container');
        const allItemGroups = Array.from(container.querySelectorAll('.item-group'));
        const currentIndex = allItemGroups.indexOf(itemGroup);
        
        let newIndex;
        if (direction === 'up') {
            newIndex = currentIndex - 1;
            if (newIndex < 0) return; // 既に最上位
        } else { // direction === 'down'
            newIndex = currentIndex + 1;
            if (newIndex >= allItemGroups.length) return; // 既に最下位
        }
        
        // DOM要素を移動
        const targetItemGroup = allItemGroups[newIndex];
        if (direction === 'up') {
            container.insertBefore(itemGroup, targetItemGroup);
        } else {
            container.insertBefore(itemGroup, targetItemGroup.nextSibling);
        }
        
        this.updateSortButtonStates();
        this.updatePreview();
    }

    // タスク並べ替え
    moveTaskOrder(button, direction) {
        const taskWrapper = button.closest('.task-input-wrapper');
        const tasksContainer = taskWrapper.closest('.tasks-container');
        const allTaskWrappers = Array.from(tasksContainer.querySelectorAll('.task-input-wrapper'));
        const currentIndex = allTaskWrappers.indexOf(taskWrapper);
        
        let newIndex;
        if (direction === 'up') {
            newIndex = currentIndex - 1;
            if (newIndex < 0) return; // 既に最上位
        } else { // direction === 'down'
            newIndex = currentIndex + 1;
            if (newIndex >= allTaskWrappers.length) return; // 既に最下位
        }
        
        // DOM要素を移動
        const targetTaskWrapper = allTaskWrappers[newIndex];
        if (direction === 'up') {
            tasksContainer.insertBefore(taskWrapper, targetTaskWrapper);
        } else {
            tasksContainer.insertBefore(taskWrapper, targetTaskWrapper.nextSibling);
        }
        
        this.updateSortButtonStates();
        this.updatePreview();
    }

    // 並べ替えボタンの状態を更新
    updateSortButtonStates() {
        const containers = ['resultsContainer', 'plansContainer'];
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            
            // プロジェクトの並べ替えボタン状態を更新
            const itemGroups = Array.from(container.querySelectorAll('.item-group'));
            itemGroups.forEach((itemGroup, index) => {
                const upBtn = itemGroup.querySelector('.move-up-project');
                const downBtn = itemGroup.querySelector('.move-down-project');
                
                if (upBtn) {
                    upBtn.disabled = (index === 0); // 最初の項目の↑を無効
                }
                if (downBtn) {
                    downBtn.disabled = (index === itemGroups.length - 1); // 最後の項目の↓を無効
                }
                
                // 各プロジェクト内のタスクの並べ替えボタン状態を更新
                const tasksContainer = itemGroup.querySelector('.tasks-container');
                if (tasksContainer) {
                    const taskWrappers = Array.from(tasksContainer.querySelectorAll('.task-input-wrapper'));
                    taskWrappers.forEach((taskWrapper, taskIndex) => {
                        const taskUpBtn = taskWrapper.querySelector('.move-up-task');
                        const taskDownBtn = taskWrapper.querySelector('.move-down-task');
                        
                        if (taskUpBtn) {
                            taskUpBtn.disabled = (taskIndex === 0); // 最初のタスクの↑を無効
                        }
                        if (taskDownBtn) {
                            taskDownBtn.disabled = (taskIndex === taskWrappers.length - 1); // 最後のタスクの↓を無効
                        }
                    });
                }
            });
        });
    }

    // 予定を実績に複写
    copyPlansToResults() {
        const plansData = this.getInputData('plansContainer');
        const resultsContainer = document.getElementById('resultsContainer');
        
        if (plansData.length === 0) {
            return;
        }
        
        // 実績をクリア
        resultsContainer.innerHTML = '';
        
        // 予定の日付を実績日に設定
        const planDate = document.getElementById('planDate').value;
        document.getElementById('resultDate').value = planDate;
        
        // 次の日を予定日に設定
        const nextDay = new Date(planDate);
        nextDay.setDate(nextDay.getDate() + 1);
        document.getElementById('planDate').value = this.formatDate(nextDay);
        
        // 予定データを実績に複写
        plansData.forEach((planItem, index) => {
            if (index === 0) {
                this.addItemGroup('resultsContainer');
            } else {
                this.addItemGroup('resultsContainer');
            }
            
            const itemGroups = resultsContainer.querySelectorAll('.item-group');
            const currentGroup = itemGroups[index];
            
            // 顧客名設定
            const customerInput = currentGroup.querySelector('.customer-input');
            customerInput.value = planItem.customer;
            
            // イベント委譲により自動的に処理される
            
            // タスク設定
            const tasksContainer = currentGroup.querySelector('.tasks-container');
            tasksContainer.innerHTML = '';
            
            planItem.tasks.forEach(task => {
                // タスクテキストから本体と括弧内を分離
                const match = task.match(/^(.+?)\((.+?)\)$/);
                const mainText = match ? match[1] : task;
                const subText = match ? match[2] : '';
                
                const taskWrapper = document.createElement('div');
                taskWrapper.className = 'task-input-wrapper';
                taskWrapper.innerHTML = `
                    <div class="task-inputs">
                        <input type="text" class="task-input-main" placeholder="実施項目" value="${mainText}">
                        <input type="text" class="task-input-sub" placeholder="(詳細)" value="${subText}">
                        <button type="button" class="btn btn-icon move-up-task" title="上に移動">↑</button>
                        <button type="button" class="btn btn-icon move-down-task" title="下に移動">↓</button>
                        <button type="button" class="btn btn-icon move-task-to-plan" title="予定に移動">→</button>
                        <button type="button" class="btn btn-icon delete-task" title="項目削除">×</button>
                    </div>
                    <div class="autocomplete-list"></div>
                `;
                tasksContainer.appendChild(taskWrapper);
                
                // イベント委譲により自動的に処理される
            });
        });
        
        // 予定をクリア
        const plansContainer = document.getElementById('plansContainer');
        plansContainer.innerHTML = `
            <div class="item-group">
                <div class="item-controls">
                    <button type="button" class="btn btn-icon move-up-project" title="上に移動">↑</button>
                    <button type="button" class="btn btn-icon move-down-project" title="下に移動">↓</button>
                    <button type="button" class="btn btn-icon move-to-result" title="実績に移動">←</button>
                    <button type="button" class="btn btn-icon delete-item" title="削除">×</button>
                </div>
                <div class="customer-input-wrapper">
                    <input type="text" class="customer-input" placeholder="顧客・プロジェクト名">
                    <div class="autocomplete-list"></div>
                </div>
                <div class="tasks-container">
                    <div class="task-input-wrapper">
                        <div class="task-inputs">
                            <input type="text" class="task-input-main" placeholder="予定項目">
                            <input type="text" class="task-input-sub" placeholder="(詳細)">
                            <button type="button" class="btn btn-icon move-up-task" title="上に移動">↑</button>
                            <button type="button" class="btn btn-icon move-down-task" title="下に移動">↓</button>
                            <button type="button" class="btn btn-icon move-task-to-result" title="実績に移動">←</button>
                            <button type="button" class="btn btn-icon delete-task" title="項目削除">×</button>
                        </div>
                        <div class="autocomplete-list"></div>
                    </div>
                </div>
                <button type="button" class="btn btn-small add-task-btn">項目追加</button>
            </div>
        `;
        
        this.updateSortButtonStates();
        this.updatePreview();
    }
    
    // 設定編集表示
    showSettingsEditor() {
        const modal = document.getElementById('settingsModal');
        const textarea = document.getElementById('settingsTextarea');
        
        const settingsData = {
            customers: this.data.customers,
            tasks: this.data.tasks
        };
        
        textarea.value = JSON.stringify(settingsData, null, 2);
        modal.style.display = 'flex';
        
        // モーダル外クリックで閉じる
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideSettingsEditor();
            }
        });
    }
    
    // 設定編集非表示
    hideSettingsEditor() {
        const modal = document.getElementById('settingsModal');
        modal.style.display = 'none';
    }
    
    // 設定保存
    saveSettings() {
        const textarea = document.getElementById('settingsTextarea');
        
        try {
            const settingsData = JSON.parse(textarea.value);
            
            if (!settingsData.customers || !Array.isArray(settingsData.customers)) {
                throw new Error('customers配列が正しくありません');
            }
            
            if (!settingsData.tasks || !Array.isArray(settingsData.tasks)) {
                throw new Error('tasks配列が正しくありません');
            }
            
            // データ形式の検証
            settingsData.customers.forEach((customer, index) => {
                if (!customer.name || typeof customer.useCount !== 'number' || !customer.lastUsed) {
                    throw new Error(`customers[${index}]のデータ形式が正しくありません`);
                }
            });
            
            settingsData.tasks.forEach((task, index) => {
                if (!task.text || typeof task.useCount !== 'number' || !task.lastUsed) {
                    throw new Error(`tasks[${index}]のデータ形式が正しくありません`);
                }
            });
            
            // データを更新
            this.data.customers = settingsData.customers;
            this.data.tasks = settingsData.tasks;
            
            this.saveData();
            this.hideSettingsEditor();
            this.showToast('設定を保存しました。', 'success');
            
        } catch (error) {
            this.showToast(`設定の保存に失敗しました: ${error.message}`, 'error');
        }
    }
    
    // テーマ初期化
    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
    }
    
    // テーマ切り替え
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateThemeIcon(newTheme);
    }
    
    // テーマアイコン更新
    updateThemeIcon(theme) {
        const icon = document.querySelector('.theme-icon');
        icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
    
    // セッション保存
    saveCurrentSession() {
        const sessionData = {
            resultDate: document.getElementById('resultDate').value,
            planDate: document.getElementById('planDate').value,
            results: this.getInputData('resultsContainer'),
            plans: this.getInputData('plansContainer'),
            timestamp: new Date().toISOString()
        };
        localStorage.setItem('lastSession', JSON.stringify(sessionData));
    }

    // セッション読み込み
    loadLastSession() {
        const savedSession = localStorage.getItem('lastSession');
        if (!savedSession) return;
        
        try {
            const sessionData = JSON.parse(savedSession);
            
            // 日付設定
            if (sessionData.resultDate) {
                document.getElementById('resultDate').value = sessionData.resultDate;
            }
            if (sessionData.planDate) {
                document.getElementById('planDate').value = sessionData.planDate;
            }
            
            // セッション復元
            this.restoreSessionData(sessionData);
            
        } catch (error) {
            console.warn('セッションデータの読み込みに失敗しました:', error);
        }
    }

    // セッションデータ復元
    restoreSessionData(data) {
        // コンテナクリア
        this.clearContainers();
        
        // 実績データ復元
        if (data.results && data.results.length > 0) {
            const resultsContainer = document.getElementById('resultsContainer');
            resultsContainer.innerHTML = '';
            
            data.results.forEach(item => {
                this.addItemGroupWithData(resultsContainer, item, true);
            });
        }
        
        // 予定データ復元
        if (data.plans && data.plans.length > 0) {
            const plansContainer = document.getElementById('plansContainer');
            plansContainer.innerHTML = '';
            
            data.plans.forEach(item => {
                this.addItemGroupWithData(plansContainer, item, false);
            });
        }
    }

    // 現在の日付を更新
    updateCurrentDate() {
        const now = new Date();
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        };
        const dateString = now.toLocaleDateString('ja-JP', options);
        document.getElementById('currentDate').textContent = dateString;
    }

    // リアルタイム更新開始
    startRealTimeUpdate() {
        // 初回表示
        this.updateCurrentDate();

        // 毎秒1分更新
        setInterval(() => {
            this.updateCurrentDate();
        }, 60000);
    }

    // 過去レポート表示更新
    updateHistoryDisplay() {
        const select = document.getElementById('historySelect');
        const preview = document.getElementById('historyPreview');
        const reportId = select.value;

        if (!reportId) {
            preview.textContent = 'レポートを選択してください...';
            return;
        }

        const report = this.data.reports.find(r => r.id === reportId);
        if (report && report.markdown) {
            preview.textContent = report.markdown;
        } else {
            preview.textContent = 'レポートが見つかりません...';
        }
    }

    // 実績からプロジェクトを予定に複写
    copyItemToPlan(button) {
        const itemGroup = button.closest('.item-group');
        const targetContainer = document.getElementById('plansContainer');

        // データを取得
        const customerInput = itemGroup.querySelector('.customer-input');
        const customerValue = customerInput.value;

        const taskWrappers = itemGroup.querySelectorAll('.task-input-wrapper');
        const taskData = Array.from(taskWrappers).map(wrapper => {
            const mainInput = wrapper.querySelector('.task-input-main');
            const subInput = wrapper.querySelector('.task-input-sub');
            return {
                main: mainInput ? mainInput.value : '',
                sub: subInput ? subInput.value : ''
            };
        }).filter(task => task.main.trim());

        if (!customerValue.trim() || taskData.length === 0) {
            this.showToast('複写するデータがありません。', 'warning');
            return;
        }

        // 新しいアイテムグループを作成
        this.addItemGroup('plansContainer');
        const newItemGroups = targetContainer.querySelectorAll('.item-group');
        const newItemGroup = newItemGroups[newItemGroups.length - 1];

        // データを設定
        const newCustomerInput = newItemGroup.querySelector('.customer-input');
        newCustomerInput.value = customerValue;

        const newTasksContainer = newItemGroup.querySelector('.tasks-container');
        newTasksContainer.innerHTML = '';

        taskData.forEach(task => {
            const taskWrapper = document.createElement('div');
            taskWrapper.className = 'task-input-wrapper';

            // 詳細に「・続き」を追加
            let newSubValue = task.sub;
            if (newSubValue.trim()) {
                newSubValue = newSubValue + '・続き';
            } else {
                newSubValue = '続き';
            }

            taskWrapper.innerHTML = `
                <div class="task-inputs">
                    <input type="text" class="task-input-main" placeholder="項目" value="${task.main}">
                    <input type="text" class="task-input-sub" placeholder="(詳細)" value="${newSubValue}">
                    <button type="button" class="btn btn-icon move-up-task" title="上に移動">↑</button>
                    <button type="button" class="btn btn-icon move-down-task" title="下に移動">↓</button>
                    <button type="button" class="btn btn-icon move-task-to-result" title="実績に移動">←</button>
                    <button type="button" class="btn btn-icon delete-task" title="項目削除">×</button>
                </div>
                <div class="autocomplete-list"></div>
            `;
            newTasksContainer.appendChild(taskWrapper);
        });

        this.setupItemGroupEvents(newItemGroup);
        this.updatePreview();
        this.updateSortButtonStates();

        this.showToast('プロジェクトを予定に複写しました。', 'success');
    }

    // 実績からタスクを予定に複写
    copyTaskToPlan(button) {
        const taskWrapper = button.closest('.task-input-wrapper');
        const sourceItemGroup = taskWrapper.closest('.item-group');
        const targetContainer = document.getElementById('plansContainer');

        // タスクデータを取得
        const mainInput = taskWrapper.querySelector('.task-input-main');
        const subInput = taskWrapper.querySelector('.task-input-sub');
        const mainValue = mainInput ? mainInput.value.trim() : '';
        const subValue = subInput ? subInput.value.trim() : '';

        if (!mainValue) {
            this.showToast('複写するタスクがありません。', 'warning');
            return;
        }

        // 顧客名を取得
        const sourceCustomerInput = sourceItemGroup.querySelector('.customer-input');
        const customerValue = sourceCustomerInput ? sourceCustomerInput.value.trim() : '';

        if (!customerValue) {
            this.showToast('顧客・プロジェクト名が入力されていません。', 'warning');
            return;
        }

        // 移動先で同じ顧客のアイテムグループを探す
        let targetItemGroup = null;
        const targetItemGroups = targetContainer.querySelectorAll('.item-group');

        for (const group of targetItemGroups) {
            const customerInput = group.querySelector('.customer-input');
            if (customerInput && customerInput.value.trim() === customerValue) {
                targetItemGroup = group;
                break;
            }
        }

        // 移動先に同じ顧客がない場合、新しいアイテムグループを作成
        if (!targetItemGroup) {
            this.addItemGroup('plansContainer');
            const newGroups = targetContainer.querySelectorAll('.item-group');
            targetItemGroup = newGroups[newGroups.length - 1];

            // 顧客名を設定
            const targetCustomerInput = targetItemGroup.querySelector('.customer-input');
            if (targetCustomerInput) {
                targetCustomerInput.value = customerValue;
            }

            // 既存のデフォルトタスクを削除
            const targetTasksContainer = targetItemGroup.querySelector('.tasks-container');
            targetTasksContainer.innerHTML = '';
        }

        // 移動先にタスクを追加
        const targetTasksContainer = targetItemGroup.querySelector('.tasks-container');
        const newTaskWrapper = document.createElement('div');
        newTaskWrapper.className = 'task-input-wrapper';

        // 詳細に「・続き」を追加
        let newSubValue = subValue;
        if (newSubValue.trim()) {
            newSubValue = newSubValue + '・続き';
        } else {
            newSubValue = '続き';
        }

        newTaskWrapper.innerHTML = `
            <div class="task-inputs">
                <input type="text" class="task-input-main" placeholder="予定項目" value="${mainValue}">
                <input type="text" class="task-input-sub" placeholder="(詳細)" value="${newSubValue}">
                <button type="button" class="btn btn-icon move-up-task" title="上に移動">↑</button>
                <button type="button" class="btn btn-icon move-down-task" title="下に移動">↓</button>
                <button type="button" class="btn btn-icon move-task-to-result" title="実績に移動">←</button>
                <button type="button" class="btn btn-icon delete-task" title="項目削除">×</button>
            </div>
            <div class="autocomplete-list"></div>
        `;

        targetTasksContainer.appendChild(newTaskWrapper);

        this.updatePreview();
        this.updateSortButtonStates();

        this.showToast('タスクを予定に複写しました。', 'success');
    }

    // カレンダー機能
    showCalendar() {
        this.currentCalendarDate = new Date();
        this.renderCalendar();
        document.getElementById('calendarModal').style.display = 'flex';
    }

    hideCalendar() {
        document.getElementById('calendarModal').style.display = 'none';
    }

    changeMonth(direction) {
        this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() + direction);
        this.renderCalendar();
    }

    renderCalendar() {
        const year = this.currentCalendarDate.getFullYear();
        const month = this.currentCalendarDate.getMonth();
        const today = new Date();

        // 月年表示を更新
        const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月',
                           '7月', '8月', '9月', '10月', '11月', '12月'];
        document.getElementById('currentMonth').textContent = `${year}年 ${monthNames[month]}`;

        // カレンダーグリッドをクリア
        const grid = document.getElementById('calendarGrid');
        grid.innerHTML = '';

        // 曜日ヘッダーを追加
        const dayHeaders = ['日', '月', '火', '水', '木', '金', '土'];
        dayHeaders.forEach(day => {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day header';
            dayElement.textContent = day;
            grid.appendChild(dayElement);
        });

        // 月の最初の日と最後の日を取得
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const firstDayOfWeek = firstDay.getDay();
        const daysInMonth = lastDay.getDate();

        // 前月の末尾の日々を追加
        const prevMonth = new Date(year, month - 1, 0);
        const daysInPrevMonth = prevMonth.getDate();
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day other-month';
            dayElement.textContent = daysInPrevMonth - i;
            grid.appendChild(dayElement);
        }

        // 現在の月の日々を追加
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = day;

            // 今日の日付をハイライト
            if (year === today.getFullYear() &&
                month === today.getMonth() &&
                day === today.getDate()) {
                dayElement.classList.add('today');
            }

            grid.appendChild(dayElement);
        }

        // 次月の最初の日々を追加（グリッドを埋めるため）
        const remainingCells = 42 - (firstDayOfWeek + daysInMonth); // 6週間 = 42セル
        for (let day = 1; day <= remainingCells; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day other-month';
            dayElement.textContent = day;
            grid.appendChild(dayElement);
        }
    }

    // Toast通知システム
    showToast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        toast.innerHTML = `
            <div>${message}</div>
            <button class="toast-close" type="button">&times;</button>
        `;

        container.appendChild(toast);

        // 閉じるボタンのイベント
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.removeToast(toast));

        // アニメーション表示
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        // 自動削除
        setTimeout(() => {
            this.removeToast(toast);
        }, duration);
    }

    removeToast(toast) {
        if (toast.parentNode) {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    }
}

// アプリケーション開始
document.addEventListener('DOMContentLoaded', () => {
    new BusinessReportApp();
});