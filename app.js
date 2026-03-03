const STORAGE_KEY = "it-loan-system-web-demo-v1";
const STORAGE_META_KEY = "it-loan-system-web-demo-v1-meta";
const DAY_MS = 24 * 60 * 60 * 1000;
const REMINDER_WEBHOOK_URL = "";
const REMINDER_TRIGGERS = {
  due_in_7_days: {
    code: "due_in_7_days",
    label: "7-day reminder",
    subjectPrefix: "IT Loan Reminder (7 Days Remaining)",
  },
  due_in_1_day: {
    code: "due_in_1_day",
    label: "1-day reminder",
    subjectPrefix: "IT Loan Reminder (Due Tomorrow)",
  },
  due_today: {
    code: "due_today",
    label: "Due today reminder",
    subjectPrefix: "IT Loan Reminder (Due Today)",
  },
  overdue_day_1: {
    code: "overdue_day_1",
    label: "Day-late reminder",
    subjectPrefix: "Overdue IT Loan Reminder",
  },
  overdue_weekly: {
    code: "overdue_weekly",
    label: "Weekly overdue reminder",
    subjectPrefix: "Weekly Overdue IT Loan Reminder",
  },
  manual_overdue: {
    code: "manual_overdue",
    label: "Manual overdue reminder",
    subjectPrefix: "Overdue IT Loan Reminder",
  },
};

const state = {
  data: loadState(),
  selected: {
    equipment: null,
    user: null,
    loan: null,
  },
  activeTab: "dashboard",
};

const elements = {
  tabButtons: document.querySelectorAll(".tab-btn"),
  tabPanels: document.querySelectorAll(".tab-panel"),
  statusText: document.getElementById("status-text"),
  refreshBtn: document.getElementById("refresh-btn"),
  loadSampleBtn: document.getElementById("load-sample-btn"),
  randomFakeBtn: document.getElementById("random-fake-btn"),
  resetDataBtn: document.getElementById("reset-data-btn"),
  quickActionButtons: document.querySelectorAll("[data-switch-tab]"),
  equipmentFilter: document.getElementById("equipment-filter"),

  statTotal: document.getElementById("stat-total"),
  statAvailable: document.getElementById("stat-available"),
  statOnLoan: document.getElementById("stat-on-loan"),
  statUnderRepair: document.getElementById("stat-under-repair"),
  statOverdue: document.getElementById("stat-overdue"),

  overdueBody: document.querySelector("#overdue-table tbody"),
  equipmentBody: document.querySelector("#equipment-table tbody"),
  usersBody: document.querySelector("#users-table tbody"),
  loansBody: document.querySelector("#loans-table tbody"),

  addEquipmentBtn: document.getElementById("add-equipment-btn"),
  deleteEquipmentBtn: document.getElementById("delete-equipment-btn"),
  markUnderRepairBtn: document.getElementById("mark-under-repair-btn"),
  markAvailableBtn: document.getElementById("mark-available-btn"),
  addUserBtn: document.getElementById("add-user-btn"),
  deleteUserBtn: document.getElementById("delete-user-btn"),
  newLoanBtn: document.getElementById("new-loan-btn"),
  returnLoanBtn: document.getElementById("return-loan-btn"),
  extendLoanBtn: document.getElementById("extend-loan-btn"),
  remindLoanBtn: document.getElementById("remind-loan-btn"),
  reminderCycleBtn: document.getElementById("reminder-cycle-btn"),

  modalRoot: document.getElementById("modal-root"),
  modalTitle: document.getElementById("modal-title"),
  modalForm: document.getElementById("modal-form"),
  modalClose: document.getElementById("modal-close"),
};

boot();

function boot() {
  bindEvents();
  const bootMessage = bootstrapDemoData();
  switchTab(state.activeTab);
  refreshAll(bootMessage || "Ready");
}

function bindEvents() {
  elements.tabButtons.forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.tab));
  });

  elements.quickActionButtons.forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.switchTab));
  });

  elements.refreshBtn.addEventListener("click", () => {
    refreshAll(`Updated: ${formatTime(new Date())}`);
  });

  elements.loadSampleBtn.addEventListener("click", loadSampleData);
  elements.randomFakeBtn.addEventListener("click", loadRandomFakeData);
  elements.resetDataBtn.addEventListener("click", resetData);
  elements.equipmentFilter.addEventListener("change", renderEquipment);

  elements.addEquipmentBtn.addEventListener("click", openAddEquipmentDialog);
  elements.deleteEquipmentBtn.addEventListener("click", deleteEquipment);
  elements.markUnderRepairBtn.addEventListener("click", () => markEquipmentStatus("under_repair"));
  elements.markAvailableBtn.addEventListener("click", () => markEquipmentStatus("available"));
  elements.addUserBtn.addEventListener("click", openAddUserDialog);
  elements.deleteUserBtn.addEventListener("click", deleteUser);
  elements.newLoanBtn.addEventListener("click", openNewLoanDialog);
  elements.returnLoanBtn.addEventListener("click", returnLoan);
  elements.extendLoanBtn.addEventListener("click", openExtendLoanDialog);
  elements.remindLoanBtn.addEventListener("click", remindUser);
  elements.reminderCycleBtn.addEventListener("click", runReminderCycle);

  bindTableSelection("equipment", elements.equipmentBody);
  bindTableSelection("user", elements.usersBody);
  bindTableSelection("loan", elements.loansBody);

  elements.modalClose.addEventListener("click", closeModal);
  elements.modalRoot.addEventListener("click", (event) => {
    if (event.target === elements.modalRoot) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.modalRoot.classList.contains("hidden")) {
      closeModal();
    }
  });
}

function switchTab(tabName) {
  state.activeTab = tabName;

  elements.tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });

  elements.tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tab-${tabName}`);
  });
}

function refreshAll(statusMessage) {
  renderDashboard();
  renderEquipment();
  renderUsers();
  renderLoans();
  setStatus(statusMessage || `Updated: ${formatTime(new Date())}`);
}

function setStatus(message) {
  elements.statusText.textContent = message;
}

function renderDashboard() {
  const allEquipment = state.data.equipment;
  const activeLoans = state.data.loans.filter((loan) => loan.status === "active");
  const overdueLoans = activeLoans
    .filter((loan) => new Date(loan.dueDate).getTime() < Date.now())
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  elements.statTotal.textContent = String(allEquipment.length);
  elements.statAvailable.textContent = String(
    allEquipment.filter((item) => item.status === "available").length
  );
  elements.statOnLoan.textContent = String(
    allEquipment.filter((item) => item.status === "on_loan").length
  );
  elements.statUnderRepair.textContent = String(
    allEquipment.filter((item) => item.status === "under_repair").length
  );
  elements.statOverdue.textContent = String(overdueLoans.length);

  if (overdueLoans.length === 0) {
    elements.overdueBody.innerHTML =
      '<tr><td class="empty-row" colspan="4">No overdue loans.</td></tr>';
    return;
  }

  elements.overdueBody.innerHTML = overdueLoans
    .map((loan) => {
      const equipment = getEquipmentById(loan.equipmentId);
      const user = getUserById(loan.userId);
      const daysOverdue = Math.floor((Date.now() - new Date(loan.dueDate).getTime()) / DAY_MS);

      return `
        <tr>
          <td>${loan.id}</td>
          <td>${escapeHtml(equipment?.name || `[Deleted equipment #${loan.equipmentId}]`)}</td>
          <td>${escapeHtml(formatUserName(user) || `[Deleted user #${loan.userId}]`)}</td>
          <td>${daysOverdue}</td>
        </tr>
      `;
    })
    .join("");
}

function renderEquipment() {
  const filterValue = elements.equipmentFilter.value;
  let equipment = [...state.data.equipment].sort((a, b) => a.id - b.id);

  if (filterValue === "available") {
    equipment = equipment.filter((item) => item.status === "available");
  } else if (filterValue === "on_loan") {
    equipment = equipment.filter((item) => item.status === "on_loan");
  } else if (filterValue === "under_repair") {
    equipment = equipment.filter((item) => item.status === "under_repair");
  }

  if (equipment.length === 0) {
    elements.equipmentBody.innerHTML =
      '<tr><td class="empty-row" colspan="6">No equipment found.</td></tr>';
    return;
  }

  elements.equipmentBody.innerHTML = equipment
    .map((item) => {
      const selectedClass = state.selected.equipment === item.id ? "selected" : "";
      const statusLabel = formatEquipmentStatus(item.status);

      return `
        <tr data-id="${item.id}" class="${selectedClass}">
          <td>${item.id}</td>
          <td>${escapeHtml(item.assetTag)}</td>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.category)}</td>
          <td>${statusLabel}</td>
          <td>${escapeHtml(item.condition || "Good")}</td>
        </tr>
      `;
    })
    .join("");
}

function renderUsers() {
  const users = state.data.users
    .filter((user) => user.isActive)
    .sort((a, b) => a.id - b.id);

  if (users.length === 0) {
    elements.usersBody.innerHTML = '<tr><td class="empty-row" colspan="6">No users found.</td></tr>';
    return;
  }

  elements.usersBody.innerHTML = users
    .map((user) => {
      const selectedClass = state.selected.user === user.id ? "selected" : "";
      return `
        <tr data-id="${user.id}" class="${selectedClass}">
          <td>${user.id}</td>
          <td>${escapeHtml(user.staffId)}</td>
          <td>${escapeHtml(formatUserName(user))}</td>
          <td>${escapeHtml(user.email)}</td>
          <td>${escapeHtml(user.department || "")}</td>
          <td>${user.lateReturns || 0}</td>
        </tr>
      `;
    })
    .join("");
}

function renderLoans() {
  const now = Date.now();
  const loans = state.data.loans
    .filter((loan) => loan.status === "active")
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  if (loans.length === 0) {
    elements.loansBody.innerHTML = '<tr><td class="empty-row" colspan="6">No active loans found.</td></tr>';
    return;
  }

  elements.loansBody.innerHTML = loans
    .map((loan) => {
      const equipment = getEquipmentById(loan.equipmentId);
      const user = getUserById(loan.userId);
      const days = Math.floor((new Date(loan.dueDate).getTime() - now) / DAY_MS);

      let statusText = "Active";
      let statusClass = "status-active";
      let daysText = `${days} days`;

      if (days < 0) {
        statusText = "OVERDUE";
        statusClass = "status-overdue";
        daysText = `${Math.abs(days)} days`;
      } else if (days === 0) {
        statusText = "DUE TODAY";
        statusClass = "status-due";
        daysText = "Today";
      }

      const selectedClass = state.selected.loan === loan.id ? "selected" : "";

      return `
        <tr data-id="${loan.id}" class="${selectedClass}">
          <td>${loan.id}</td>
          <td>${escapeHtml(equipment?.name || `[Deleted equipment #${loan.equipmentId}]`)}</td>
          <td>${escapeHtml(formatUserName(user) || `[Deleted user #${loan.userId}]`)}</td>
          <td>${formatDate(loan.dueDate)}</td>
          <td><span class="status-pill ${statusClass}">${statusText}</span></td>
          <td>${daysText}</td>
        </tr>
      `;
    })
    .join("");
}

function bindTableSelection(type, tbodyElement) {
  tbodyElement.addEventListener("click", (event) => {
    const row = event.target.closest("tr[data-id]");
    if (!row) {
      return;
    }

    const id = Number(row.dataset.id);
    state.selected[type] = id;

    if (type === "equipment") {
      renderEquipment();
    }
    if (type === "user") {
      renderUsers();
    }
    if (type === "loan") {
      renderLoans();
    }

    setStatus(`Selected ${type} ID ${id}`);
  });
}

function openAddEquipmentDialog() {
  openFormModal({
    title: "Add Equipment",
    submitLabel: "Save",
    fields: [
      { name: "assetTag", label: "Asset Tag", required: true },
      { name: "name", label: "Name", required: true },
      {
        name: "category",
        label: "Category",
        type: "select",
        required: true,
        options: ["Laptop", "Tablet", "Projector", "Camera", "Audio", "Other"].map((value) => ({
          value,
          label: value,
        })),
        value: "Laptop",
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        required: true,
        options: [
          { value: "available", label: "Available" },
          { value: "under_repair", label: "Under Repair" },
        ],
        value: "available",
      },
      { name: "manufacturer", label: "Manufacturer" },
      { name: "location", label: "Location" },
    ],
    onSubmit: (values) => {
      if (
        state.data.equipment.some(
          (item) => item.assetTag.toLowerCase() === values.assetTag.trim().toLowerCase()
        )
      ) {
        return { error: "Asset tag already exists." };
      }

      const equipment = {
        id: nextId("equipment"),
        assetTag: values.assetTag.trim(),
        name: values.name.trim(),
        category: values.category,
        manufacturer: values.manufacturer.trim(),
        status: values.status || "available",
        condition: "Good",
        location: values.location.trim(),
        createdAt: nowIso(),
      };

      state.data.equipment.push(equipment);
      addAudit("create", "equipment", equipment.id, `${equipment.assetTag} added`);
      saveState();
      return { status: "Equipment added!" };
    },
  });
}

function deleteEquipment() {
  const equipmentId = state.selected.equipment;
  if (!equipmentId) {
    alert("Select equipment to delete");
    return;
  }

  if (!confirm("Delete this equipment?")) {
    return;
  }

  state.data.equipment = state.data.equipment.filter((item) => item.id !== equipmentId);
  addAudit("delete", "equipment", equipmentId, "Equipment deleted");
  state.selected.equipment = null;
  saveState();
  refreshAll("Equipment deleted.");
}

function markEquipmentStatus(targetStatus) {
  const equipmentId = state.selected.equipment;
  if (!equipmentId) {
    alert("Select equipment first");
    return;
  }

  const equipment = getEquipmentById(equipmentId);
  if (!equipment) {
    alert("Selected equipment was not found.");
    return;
  }

  if (equipment.status === "on_loan" && targetStatus === "under_repair") {
    alert("Cannot mark an on-loan item as under repair. Return it first.");
    return;
  }

  if (equipment.status === targetStatus) {
    alert(`Equipment is already ${formatEquipmentStatus(targetStatus)}.`);
    return;
  }

  equipment.status = targetStatus;
  addAudit("update", "equipment", equipment.id, `Status set to ${targetStatus}`);
  saveState();
  refreshAll(`Equipment ${equipment.assetTag} marked ${formatEquipmentStatus(targetStatus)}.`);
}

function openAddUserDialog() {
  openFormModal({
    title: "Add User",
    submitLabel: "Save",
    fields: [
      { name: "staffId", label: "Staff ID", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "firstName", label: "First Name", required: true },
      { name: "lastName", label: "Last Name", required: true },
      { name: "department", label: "Department" },
    ],
    onSubmit: (values) => {
      if (
        state.data.users.some(
          (user) => user.staffId.toLowerCase() === values.staffId.trim().toLowerCase()
        )
      ) {
        return { error: "Staff ID already exists." };
      }

      if (state.data.users.some((user) => user.email.toLowerCase() === values.email.trim().toLowerCase())) {
        return { error: "Email already exists." };
      }

      const user = {
        id: nextId("user"),
        staffId: values.staffId.trim(),
        email: values.email.trim(),
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        department: values.department.trim(),
        lateReturns: 0,
        isActive: true,
      };

      state.data.users.push(user);
      addAudit("create", "user", user.id, `${user.staffId} added`);
      saveState();
      return { status: "User added!" };
    },
  });
}

function deleteUser() {
  const userId = state.selected.user;
  if (!userId) {
    alert("Select user to delete");
    return;
  }

  if (!confirm("Delete this user?")) {
    return;
  }

  state.data.users = state.data.users.filter((user) => user.id !== userId);
  addAudit("delete", "user", userId, "User deleted");
  state.selected.user = null;
  saveState();
  refreshAll("User deleted.");
}

function openNewLoanDialog() {
  const availableEquipment = state.data.equipment.filter((item) => item.status === "available");
  const users = state.data.users.filter((user) => user.isActive);

  if (availableEquipment.length === 0) {
    alert("No available equipment!");
    return;
  }

  if (users.length === 0) {
    alert("No users found!");
    return;
  }

  openFormModal({
    title: "New Loan",
    submitLabel: "Create Loan",
    fields: [
      {
        name: "equipmentId",
        label: "Equipment",
        type: "select",
        required: true,
        options: availableEquipment.map((item) => ({
          value: String(item.id),
          label: `${item.assetTag} - ${item.name}`,
        })),
      },
      {
        name: "userId",
        label: "User",
        type: "select",
        required: true,
        options: users.map((user) => ({
          value: String(user.id),
          label: `${user.staffId} - ${user.firstName} ${user.lastName}`,
        })),
      },
      { name: "days", label: "Days", type: "number", min: 1, max: 365, value: 14, required: true },
    ],
    onSubmit: (values) => {
      const equipmentId = Number(values.equipmentId);
      const userId = Number(values.userId);
      const days = Number(values.days);

      if (!Number.isFinite(days) || days < 1 || days > 365) {
        return { error: "Days must be between 1 and 365." };
      }

      const equipment = getEquipmentById(equipmentId);
      const user = getUserById(userId);

      if (!equipment || equipment.status !== "available") {
        return { error: "Selected equipment is not available." };
      }

      if (!user || !user.isActive) {
        return { error: "Selected user is not active." };
      }

      const dueDate = new Date(Date.now() + days * DAY_MS);

      const loan = {
        id: nextId("loan"),
        equipmentId,
        userId,
        issuedDate: nowIso(),
        dueDate: dueDate.toISOString(),
        returnedDate: null,
        status: "active",
        purpose: "",
      };

      equipment.status = "on_loan";
      state.data.loans.push(loan);
      addAudit("create", "loan", loan.id, `Loan created for equipment ${equipmentId}`);
      saveState();
      return { status: "Loan created!" };
    },
  });
}

function returnLoan() {
  const loanId = state.selected.loan;
  if (!loanId) {
    alert("Select loan to return");
    return;
  }

  const loan = getLoanById(loanId);
  if (!loan || loan.status !== "active") {
    alert("Selected loan is not active.");
    return;
  }

  loan.status = "returned";
  loan.returnedDate = nowIso();

  const equipment = getEquipmentById(loan.equipmentId);
  if (equipment) {
    equipment.status = "available";
  }

  const user = getUserById(loan.userId);
  if (user && Date.now() > new Date(loan.dueDate).getTime()) {
    user.lateReturns = (user.lateReturns || 0) + 1;
  }

  addAudit("update", "loan", loan.id, "Loan returned");
  state.selected.loan = null;
  saveState();
  refreshAll("Equipment returned!");
}

function openExtendLoanDialog() {
  const loanId = state.selected.loan;
  if (!loanId) {
    alert("Select loan to extend");
    return;
  }

  const loan = getLoanById(loanId);
  if (!loan || loan.status !== "active") {
    alert("Selected loan is not active.");
    return;
  }

  openFormModal({
    title: "Extend Loan",
    submitLabel: "Extend",
    fields: [
      {
        name: "days",
        label: "Additional days",
        type: "number",
        min: 1,
        max: 90,
        value: 7,
        required: true,
      },
    ],
    onSubmit: (values) => {
      const days = Number(values.days);
      if (!Number.isFinite(days) || days < 1 || days > 90) {
        return { error: "Additional days must be between 1 and 90." };
      }

      const dueDate = new Date(loan.dueDate);
      dueDate.setDate(dueDate.getDate() + days);
      loan.dueDate = dueDate.toISOString();

      addAudit("update", "loan", loan.id, `Loan extended by ${days} days`);
      saveState();
      return { status: `Extended to ${formatDate(dueDate.toISOString())}` };
    },
  });
}

async function remindUser() {
  const loanId = state.selected.loan;
  if (!loanId) {
    alert("Select loan to remind");
    return;
  }

  const loan = getLoanById(loanId);
  if (!loan || loan.status !== "active") {
    alert("Selected loan is not active.");
    return;
  }

  const dueAt = new Date(loan.dueDate).getTime();
  if (Number.isNaN(dueAt)) {
    alert("Loan due date is invalid.");
    return;
  }

  if (Date.now() <= dueAt) {
    alert("This action is only for overdue loans.");
    return;
  }

  const user = getUserById(loan.userId);
  if (!user || !user.email) {
    alert("No borrower email is available for this loan.");
    return;
  }

  const trigger = REMINDER_TRIGGERS.manual_overdue;
  const equipment = getEquipmentById(loan.equipmentId);
  const reminder = buildReminderMessage({ loan, user, equipment, trigger });

  if (REMINDER_WEBHOOK_URL) {
    const result = await sendReminderViaWebhook(loan, user, reminder, trigger.code);
    if (result.ok) {
      recordReminderHistory(loan.id, trigger.code, "sent", user.email);
      addAudit("notify", "loan", loan.id, `Overdue reminder sent to ${user.email}`);
      saveState();
      refreshAll(`Reminder sent to ${user.email}.`);
      return;
    }

    alert(`Automatic sending failed (${result.error}). Opening draft email instead.`);
  }

  recordReminderHistory(loan.id, trigger.code, "drafted", user.email);
  addAudit("notify", "loan", loan.id, `Overdue reminder drafted for ${user.email}`);
  saveState();
  refreshAll(`Reminder draft opened for ${user.email}.`);
  openReminderDraft(reminder);
}

async function runReminderCycle() {
  const activeLoans = state.data.loans.filter((loan) => loan.status === "active");
  const reminders = [];

  activeLoans.forEach((loan) => {
    const trigger = getCycleReminderTrigger(loan);
    if (!trigger || hasReminderBeenSentToday(loan.id, trigger.code)) {
      return;
    }

    const user = getUserById(loan.userId);
    if (!user || !user.email) {
      addAudit("notify", "loan", loan.id, `${trigger.label} skipped (missing borrower email)`);
      return;
    }

    const equipment = getEquipmentById(loan.equipmentId);
    const reminder = buildReminderMessage({ loan, user, equipment, trigger });
    reminders.push({ loan, user, trigger, reminder });
  });

  if (reminders.length === 0) {
    refreshAll("No reminders due in this cycle.");
    return;
  }

  let sentCount = 0;
  let queuedCount = 0;
  let failedCount = 0;

  for (const entry of reminders) {
    const { loan, user, trigger, reminder } = entry;

    if (REMINDER_WEBHOOK_URL) {
      const result = await sendReminderViaWebhook(loan, user, reminder, trigger.code);
      if (result.ok) {
        sentCount += 1;
        recordReminderHistory(loan.id, trigger.code, "sent", user.email);
        addAudit("notify", "loan", loan.id, `${trigger.label} sent to ${user.email}`);
      } else {
        failedCount += 1;
        addAudit("notify", "loan", loan.id, `${trigger.label} failed: ${result.error}`);
      }
      continue;
    }

    queuedCount += 1;
    recordReminderHistory(loan.id, trigger.code, "queued", user.email);
    addAudit("notify", "loan", loan.id, `${trigger.label} queued for ${user.email}`);
  }

  saveState();

  if (REMINDER_WEBHOOK_URL) {
    refreshAll(`Reminder cycle complete: ${sentCount} sent, ${failedCount} failed.`);
    if (failedCount > 0) {
      alert(`${failedCount} reminder(s) failed. Check webhook endpoint and logs.`);
    }
    return;
  }

  refreshAll(
    `Reminder cycle complete: ${queuedCount} reminder(s) identified. Set REMINDER_WEBHOOK_URL for auto-send.`
  );
}

function getCycleReminderTrigger(loan) {
  const daysUntilDue = daysUntilDate(loan.dueDate);
  if (daysUntilDue == null) {
    return null;
  }

  if (daysUntilDue === 7) {
    return REMINDER_TRIGGERS.due_in_7_days;
  }
  if (daysUntilDue === 1) {
    return REMINDER_TRIGGERS.due_in_1_day;
  }
  if (daysUntilDue === 0) {
    return REMINDER_TRIGGERS.due_today;
  }
  if (daysUntilDue === -1) {
    return REMINDER_TRIGGERS.overdue_day_1;
  }

  if (daysUntilDue < -1) {
    const overdueDays = Math.abs(daysUntilDue);
    if (overdueDays % 7 === 0) {
      return REMINDER_TRIGGERS.overdue_weekly;
    }
  }

  return null;
}

function buildReminderMessage({ loan, user, equipment, trigger }) {
  const dueDate = formatDate(loan.dueDate);
  const dueAt = new Date(loan.dueDate).getTime();
  const overdueDays = Number.isNaN(dueAt) ? 0 : Math.max(0, Math.ceil((Date.now() - dueAt) / DAY_MS));
  const isOverdue = overdueDays > 0;
  const borrowerName = user.firstName || formatUserName(user) || "User";
  const equipmentName = equipment?.name || "College device";
  const assetTag = equipment?.assetTag || `ID ${loan.equipmentId}`;
  let statusLine = "";

  if (trigger.code === REMINDER_TRIGGERS.due_in_7_days.code) {
    statusLine = "This is a reminder that your borrowed device is due in 7 days.";
  } else if (trigger.code === REMINDER_TRIGGERS.due_in_1_day.code) {
    statusLine = "This is a reminder that your borrowed device is due tomorrow.";
  } else if (trigger.code === REMINDER_TRIGGERS.due_today.code) {
    statusLine = "This is a reminder that your borrowed device is due today.";
  } else if (trigger.code === REMINDER_TRIGGERS.overdue_day_1.code) {
    statusLine = "Your borrowed device is now overdue by 1 day.";
  } else if (trigger.code === REMINDER_TRIGGERS.overdue_weekly.code) {
    statusLine = `Your borrowed device remains overdue by ${overdueDays} days.`;
  } else {
    statusLine = `Our records show that your borrowed device is overdue by ${overdueDays} day(s).`;
  }

  const subject = `${trigger.subjectPrefix} - ${equipmentName}`;
  const body = `Hello ${borrowerName},

${statusLine}
Please return it as soon as possible, or contact IT Support to request an extended borrow period.

Loan details:
- Loan ID: ${loan.id}
- Equipment: ${equipmentName}
- Asset Tag: ${assetTag}
- Due Date: ${dueDate}
- Days Overdue: ${isOverdue ? overdueDays : 0}

If you have already returned this device, please reply so we can update the record.

Regards,
DNColleges IT Support`;

  return {
    to: user.email,
    subject,
    body,
  };
}

function openReminderDraft(reminder) {
  const mailtoLink = `mailto:${encodeURIComponent(reminder.to)}?subject=${encodeURIComponent(
    reminder.subject
  )}&body=${encodeURIComponent(reminder.body)}`;
  window.location.href = mailtoLink;
}

async function sendReminderViaWebhook(loan, user, reminder, triggerCode) {
  try {
    const response = await fetch(REMINDER_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        loanId: loan.id,
        userId: user.id,
        to: reminder.to,
        subject: reminder.subject,
        body: reminder.body,
        triggerCode,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return { ok: false, error: errorBody || `HTTP ${response.status}` };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, error: error?.message || "Network error" };
  }
}

function openFormModal(config) {
  const { title, fields, submitLabel, onSubmit } = config;
  elements.modalTitle.textContent = title;
  elements.modalForm.innerHTML = "";

  const errorBox = document.createElement("div");
  errorBox.className = "form-error";
  errorBox.hidden = true;
  elements.modalForm.appendChild(errorBox);

  fields.forEach((field) => {
    const wrapper = document.createElement("div");
    wrapper.className = "form-field";

    const label = document.createElement("label");
    label.setAttribute("for", `field-${field.name}`);
    label.textContent = field.label;
    wrapper.appendChild(label);

    let input;
    if (field.type === "select") {
      input = document.createElement("select");
      field.options.forEach((option) => {
        const optionElement = document.createElement("option");
        optionElement.value = option.value;
        optionElement.textContent = option.label;
        input.appendChild(optionElement);
      });
      if (field.value != null) {
        input.value = String(field.value);
      }
    } else {
      input = document.createElement("input");
      input.type = field.type || "text";
      if (field.value != null) {
        input.value = String(field.value);
      }
      if (field.min != null) {
        input.min = String(field.min);
      }
      if (field.max != null) {
        input.max = String(field.max);
      }
    }

    input.id = `field-${field.name}`;
    input.name = field.name;
    input.required = Boolean(field.required);

    wrapper.appendChild(input);
    elements.modalForm.appendChild(wrapper);
  });

  const actions = document.createElement("div");
  actions.className = "form-actions";

  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.className = "btn subtle";
  cancelButton.textContent = "Cancel";
  cancelButton.addEventListener("click", closeModal);

  const submitButton = document.createElement("button");
  submitButton.type = "submit";
  submitButton.className = "btn primary";
  submitButton.textContent = submitLabel;

  actions.appendChild(cancelButton);
  actions.appendChild(submitButton);
  elements.modalForm.appendChild(actions);

  elements.modalForm.onsubmit = (event) => {
    event.preventDefault();

    const values = {};
    fields.forEach((field) => {
      const formValue = elements.modalForm.elements[field.name].value;
      values[field.name] = typeof formValue === "string" ? formValue : String(formValue);
    });

    let result;
    try {
      result = onSubmit(values);
    } catch (error) {
      errorBox.textContent = error?.message || "Unexpected error.";
      errorBox.hidden = false;
      return;
    }

    if (result && result.error) {
      errorBox.textContent = result.error;
      errorBox.hidden = false;
      return;
    }

    closeModal();
    refreshAll(result?.status || `Updated: ${formatTime(new Date())}`);
  };

  elements.modalRoot.classList.remove("hidden");
  elements.modalRoot.setAttribute("aria-hidden", "false");

  const firstInput = elements.modalForm.querySelector("input, select");
  if (firstInput) {
    firstInput.focus();
  }
}

function closeModal() {
  elements.modalRoot.classList.add("hidden");
  elements.modalRoot.setAttribute("aria-hidden", "true");
  elements.modalForm.onsubmit = null;
  elements.modalForm.innerHTML = "";
}

function loadSampleData() {
  const hasExistingData =
    state.data.equipment.length > 0 || state.data.users.length > 0 || state.data.loans.length > 0;

  if (hasExistingData && !confirm("This will replace your current fake database. Continue?")) {
    return;
  }

  state.data = createSampleState();
  state.selected = { equipment: null, user: null, loan: null };
  elements.equipmentFilter.value = "all";
  saveMeta({ seeded: true });
  saveState();
  refreshAll("Fake database restored.");
}

function loadRandomFakeData() {
  const hasExistingData =
    state.data.equipment.length > 0 || state.data.users.length > 0 || state.data.loans.length > 0;

  if (hasExistingData && !confirm("Generate a new random fake database and replace current data?")) {
    return;
  }

  state.data = createRandomState();
  state.selected = { equipment: null, user: null, loan: null };
  elements.equipmentFilter.value = "all";
  saveMeta({ seeded: true });
  saveState();
  refreshAll("Random fake database generated.");
}

function resetData() {
  if (!confirm("Clear all local fake database data?")) {
    return;
  }

  state.data = createEmptyState();
  state.selected = { equipment: null, user: null, loan: null };
  elements.equipmentFilter.value = "all";
  saveMeta({ seeded: true });
  saveState();
  refreshAll("Data cleared. You can restore fake data from the header.");
}

function bootstrapDemoData() {
  const meta = loadMeta();
  const hasNoData =
    state.data.equipment.length === 0 && state.data.users.length === 0 && state.data.loans.length === 0;

  if (!meta.seeded && hasNoData) {
    state.data = createSampleState();
    saveState();
    saveMeta({ seeded: true });
    return "Fake database loaded for demo use.";
  }

  return null;
}

function loadMeta() {
  const raw = localStorage.getItem(STORAGE_META_KEY);
  if (!raw) {
    return { seeded: false };
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      seeded: Boolean(parsed.seeded),
    };
  } catch {
    return { seeded: false };
  }
}

function saveMeta(meta) {
  localStorage.setItem(STORAGE_META_KEY, JSON.stringify(meta));
}

function createEmptyState() {
  return {
    nextIds: {
      equipment: 1,
      user: 1,
      loan: 1,
      audit: 1,
    },
    equipment: [],
    users: [],
    loans: [],
    auditLogs: [],
    notificationHistory: [],
  };
}

function createSampleState() {
  const now = Date.now();

  return {
    nextIds: {
      equipment: 6,
      user: 4,
      loan: 5,
      audit: 1,
    },
    equipment: [
      {
        id: 1,
        assetTag: "LAP-1001",
        name: "Dell Latitude 5440",
        category: "Laptop",
        manufacturer: "Dell",
        status: "on_loan",
        condition: "Good",
        location: "IT Office",
        createdAt: new Date(now - DAY_MS * 60).toISOString(),
      },
      {
        id: 2,
        assetTag: "TAB-2012",
        name: "iPad Air",
        category: "Tablet",
        manufacturer: "Apple",
        status: "available",
        condition: "Good",
        location: "Media Room",
        createdAt: new Date(now - DAY_MS * 50).toISOString(),
      },
      {
        id: 3,
        assetTag: "PROJ-3103",
        name: "Epson EB-FH52",
        category: "Projector",
        manufacturer: "Epson",
        status: "on_loan",
        condition: "Good",
        location: "Store Room A",
        createdAt: new Date(now - DAY_MS * 45).toISOString(),
      },
      {
        id: 4,
        assetTag: "CAM-8810",
        name: "Canon EOS R50",
        category: "Camera",
        manufacturer: "Canon",
        status: "on_loan",
        condition: "Good",
        location: "Studio",
        createdAt: new Date(now - DAY_MS * 35).toISOString(),
      },
      {
        id: 5,
        assetTag: "AUD-2201",
        name: "Yamaha StagePas",
        category: "Audio",
        manufacturer: "Yamaha",
        status: "under_repair",
        condition: "Good",
        location: "Events Cupboard",
        createdAt: new Date(now - DAY_MS * 30).toISOString(),
      },
    ],
    users: [
      {
        id: 1,
        staffId: "ST100",
        email: "amy.jones@dncolleges.ac.uk",
        firstName: "Amy",
        lastName: "Jones",
        department: "Business",
        lateReturns: 0,
        isActive: true,
      },
      {
        id: 2,
        staffId: "ST101",
        email: "mike.lee@dncolleges.ac.uk",
        firstName: "Mike",
        lastName: "Lee",
        department: "Engineering",
        lateReturns: 1,
        isActive: true,
      },
      {
        id: 3,
        staffId: "ST102",
        email: "sara.khan@dncolleges.ac.uk",
        firstName: "Sara",
        lastName: "Khan",
        department: "Media",
        lateReturns: 0,
        isActive: true,
      },
    ],
    loans: [
      {
        id: 1,
        equipmentId: 1,
        userId: 1,
        issuedDate: new Date(now - DAY_MS * 15).toISOString(),
        dueDate: new Date(now - DAY_MS).toISOString(),
        returnedDate: null,
        status: "active",
        purpose: "Class presentation",
      },
      {
        id: 2,
        equipmentId: 3,
        userId: 2,
        issuedDate: new Date(now - DAY_MS * 3).toISOString(),
        dueDate: new Date(now + DAY_MS * 7).toISOString(),
        returnedDate: null,
        status: "active",
        purpose: "Workshop",
      },
      {
        id: 4,
        equipmentId: 4,
        userId: 3,
        issuedDate: new Date(now - DAY_MS * 6).toISOString(),
        dueDate: new Date(now).toISOString(),
        returnedDate: null,
        status: "active",
        purpose: "Media class support",
      },
      {
        id: 3,
        equipmentId: 2,
        userId: 3,
        issuedDate: new Date(now - DAY_MS * 20).toISOString(),
        dueDate: new Date(now - DAY_MS * 12).toISOString(),
        returnedDate: new Date(now - DAY_MS * 11).toISOString(),
        status: "returned",
        purpose: "Video production",
      },
    ],
    auditLogs: [],
    notificationHistory: [],
  };
}

function createRandomState() {
  const now = Date.now();
  const categoryCatalog = [
    {
      category: "Laptop",
      prefix: "LAP",
      manufacturers: ["Dell", "HP", "Lenovo"],
      models: ["Latitude 5440", "EliteBook 840", "ThinkPad T14"],
      locations: ["IT Office", "Store Room A", "Engineering Block"],
    },
    {
      category: "Tablet",
      prefix: "TAB",
      manufacturers: ["Apple", "Samsung", "Microsoft"],
      models: ["iPad Air", "Galaxy Tab S9", "Surface Go 4"],
      locations: ["Media Room", "Library Desk", "Store Room B"],
    },
    {
      category: "Projector",
      prefix: "PROJ",
      manufacturers: ["Epson", "BenQ", "ViewSonic"],
      models: ["EB-FH52", "MH560", "PA503S"],
      locations: ["Lecture Hall", "Store Room A", "Conference Suite"],
    },
    {
      category: "Camera",
      prefix: "CAM",
      manufacturers: ["Canon", "Sony", "Nikon"],
      models: ["EOS R50", "Alpha ZV-E10", "Z30"],
      locations: ["Studio", "Media Department", "Store Room C"],
    },
    {
      category: "Audio",
      prefix: "AUD",
      manufacturers: ["Yamaha", "Shure", "Rode"],
      models: ["StagePas", "BLX24", "Wireless GO II"],
      locations: ["Events Cupboard", "Theatre", "Store Room C"],
    },
  ];

  const firstNames = [
    "Amy",
    "Mike",
    "Sara",
    "Holly",
    "Priya",
    "Ben",
    "Jason",
    "Ella",
    "Omar",
    "Liam",
    "Noah",
    "Ava",
    "Mason",
  ];
  const lastNames = [
    "Jones",
    "Lee",
    "Khan",
    "Walker",
    "Patel",
    "Smith",
    "Ahmed",
    "Brown",
    "Carter",
    "Mills",
    "Wright",
    "Baker",
    "Edwards",
  ];
  const departments = [
    "Business",
    "Engineering",
    "Media",
    "Health",
    "Computing",
    "Construction",
    "Administration",
  ];

  const equipmentCount = randomInt(10, 16);
  const userCount = randomInt(7, 11);
  const equipment = [];
  const users = [];
  const loans = [];
  let loanId = 1;

  for (let i = 1; i <= equipmentCount; i += 1) {
    const categoryData = pickRandom(categoryCatalog);
    const manufacturer = pickRandom(categoryData.manufacturers);
    const model = pickRandom(categoryData.models);

    equipment.push({
      id: i,
      assetTag: `${categoryData.prefix}-${String(2000 + i)}`,
      name: `${manufacturer} ${model}`,
      category: categoryData.category,
      manufacturer,
      status: "available",
      condition: Math.random() < 0.88 ? "Good" : "Fair",
      location: pickRandom(categoryData.locations),
      createdAt: new Date(now - randomInt(10, 180) * DAY_MS).toISOString(),
    });
  }

  for (let i = 1; i <= userCount; i += 1) {
    const firstName = pickRandom(firstNames);
    const lastName = pickRandom(lastNames);

    users.push({
      id: i,
      staffId: `ST${String(200 + i).padStart(3, "0")}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@dncolleges.ac.uk`,
      firstName,
      lastName,
      department: pickRandom(departments),
      lateReturns: 0,
      isActive: true,
    });
  }

  const activeLoanCount = Math.min(randomInt(4, 8), equipment.length - 2);
  const shuffledEquipmentIds = shuffled(equipment.map((item) => item.id));

  for (let i = 0; i < activeLoanCount; i += 1) {
    const equipmentId = shuffledEquipmentIds[i];
    const dueOffset = randomInt(-8, 21);
    const dueDate = new Date(now + dueOffset * DAY_MS);
    const issuedDate = new Date(dueDate.getTime() - randomInt(4, 24) * DAY_MS);

    loans.push({
      id: loanId,
      equipmentId,
      userId: pickRandom(users).id,
      issuedDate: issuedDate.toISOString(),
      dueDate: dueDate.toISOString(),
      returnedDate: null,
      status: "active",
      purpose: pickRandom([
        "Class presentation",
        "Workshop",
        "Off-site event",
        "Media project",
        "Lesson support",
      ]),
    });

    const equipmentRecord = equipment.find((item) => item.id === equipmentId);
    if (equipmentRecord) {
      equipmentRecord.status = "on_loan";
    }

    loanId += 1;
  }

  const returnedLoanCount = randomInt(3, 7);
  for (let i = 0; i < returnedLoanCount; i += 1) {
    const equipmentId = pickRandom(equipment).id;
    const user = pickRandom(users);
    const issuedDate = new Date(now - randomInt(20, 140) * DAY_MS);
    const dueDate = new Date(issuedDate.getTime() + randomInt(7, 21) * DAY_MS);
    const returnedAtMs = Math.min(
      dueDate.getTime() + randomInt(-3, 9) * DAY_MS,
      now - randomInt(0, 2) * DAY_MS
    );
    const returnedDate = new Date(Math.max(returnedAtMs, issuedDate.getTime() + DAY_MS));

    if (returnedDate.getTime() > dueDate.getTime()) {
      user.lateReturns += 1;
    }

    loans.push({
      id: loanId,
      equipmentId,
      userId: user.id,
      issuedDate: issuedDate.toISOString(),
      dueDate: dueDate.toISOString(),
      returnedDate: returnedDate.toISOString(),
      status: "returned",
      purpose: pickRandom([
        "Assessment setup",
        "Departmental meeting",
        "Open evening",
        "Community outreach",
      ]),
    });

    loanId += 1;
  }

  const repairCandidates = equipment.filter((item) => item.status === "available");
  const maxRepairCount = Math.min(repairCandidates.length, Math.max(1, Math.floor(equipment.length * 0.2)));
  if (maxRepairCount > 0) {
    const repairCount = randomInt(1, maxRepairCount);
    shuffled(repairCandidates)
      .slice(0, repairCount)
      .forEach((item) => {
        item.status = "under_repair";
      });
  }

  return {
    nextIds: {
      equipment: equipment.length + 1,
      user: users.length + 1,
      loan: loanId,
      audit: 2,
    },
    equipment,
    users,
    loans,
    auditLogs: [
      {
        id: 1,
        action: "seed",
        entityType: "database",
        entityId: 0,
        details: "Random fake database generated",
        timestamp: nowIso(),
      },
    ],
    notificationHistory: [],
  };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return createEmptyState();
  }

  try {
    const parsed = JSON.parse(raw);
    const blank = createEmptyState();

    return {
      nextIds: {
        ...blank.nextIds,
        ...(parsed.nextIds || {}),
      },
      equipment: Array.isArray(parsed.equipment) ? parsed.equipment : [],
      users: Array.isArray(parsed.users) ? parsed.users : [],
      loans: Array.isArray(parsed.loans) ? parsed.loans : [],
      auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
      notificationHistory: Array.isArray(parsed.notificationHistory) ? parsed.notificationHistory : [],
    };
  } catch {
    return createEmptyState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
}

function nextId(type) {
  const value = state.data.nextIds[type] || 1;
  state.data.nextIds[type] = value + 1;
  return value;
}

function addAudit(action, entityType, entityId, details) {
  state.data.auditLogs.push({
    id: nextId("audit"),
    action,
    entityType,
    entityId,
    details,
    timestamp: nowIso(),
  });
}

function getEquipmentById(id) {
  return state.data.equipment.find((item) => item.id === id);
}

function getUserById(id) {
  return state.data.users.find((user) => user.id === id);
}

function getLoanById(id) {
  return state.data.loans.find((loan) => loan.id === id);
}

function hasReminderBeenSentToday(loanId, triggerCode) {
  const today = formatDate(nowIso());
  return state.data.notificationHistory.some(
    (entry) => entry.loanId === loanId && entry.triggerCode === triggerCode && entry.sentOn === today
  );
}

function recordReminderHistory(loanId, triggerCode, delivery, to) {
  state.data.notificationHistory.push({
    loanId,
    triggerCode,
    delivery,
    to,
    sentOn: formatDate(nowIso()),
    timestamp: nowIso(),
  });
}

function daysUntilDate(isoString) {
  const dueDate = new Date(isoString);
  if (Number.isNaN(dueDate.getTime())) {
    return null;
  }

  const dueDay = startOfDayTimestamp(dueDate);
  const today = startOfDayTimestamp(new Date());
  return Math.floor((dueDay - today) / DAY_MS);
}

function startOfDayTimestamp(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(list) {
  return list[randomInt(0, list.length - 1)];
}

function shuffled(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function formatDate(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTime(date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatUserName(user) {
  if (!user) {
    return "";
  }
  return `${user.firstName} ${user.lastName}`;
}

function nowIso() {
  return new Date().toISOString();
}

function formatEquipmentStatus(status) {
  if (status === "on_loan") {
    return "On Loan";
  }
  if (status === "under_repair") {
    return "Under Repair";
  }
  return "Available";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
