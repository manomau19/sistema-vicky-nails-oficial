import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Appointment, Service } from '../types';

type DashboardProps = {
  userName: string;
  services: Service[];
  appointments: Appointment[];
  onAddService: (service: Omit<Service, 'id'>) => void;
  onUpdateService: (id: string, service: Omit<Service, 'id'>) => void;
  onDeleteService: (id: string) => void;
  onAddAppointment: (
    appointment: Omit<Appointment, 'id'>,
    serviceIds: string[],
  ) => void;
  onUpdateAppointment: (
    id: string,
    appointment: Omit<Appointment, 'id'>,
    serviceIds: string[],
  ) => void;
  onDeleteAppointment: (id: string) => void;
  onToggleAppointmentAttendance: (id: string) => void;
  onLogout: () => void;
};

type CalendarDay = {
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
};

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function generateCalendarDays(
  year: number,
  month: number,
  selected: string,
  todayStr: string,
): CalendarDay[] {
  const days: CalendarDay[] = [];

  const firstDayOfMonth = new Date(year, month - 1, 1);
  const firstWeekday = firstDayOfMonth.getDay(); // 0 (Domingo) a 6 (Sábado)

  // Dias do mês anterior
  const prevMonthLastDay = new Date(year, month - 1, 0).getDate();
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;

  for (let i = firstWeekday - 1; i >= 0; i--) {
    const dayNumber = prevMonthLastDay - i;
    const dateStr = `${prevYear}-${pad(prevMonth)}-${pad(dayNumber)}`;
    days.push({
      dateStr,
      dayNumber,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selected,
    });
  }

  // Dias do mês atual
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${pad(month)}-${pad(d)}`;
    days.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selected,
    });
  }

  // Dias do próximo mês
  const nextMonthNum = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  let nextDay = 1;
  while (days.length < 42) {
    const dateStr = `${nextYear}-${pad(nextMonthNum)}-${pad(nextDay)}`;
    days.push({
      dateStr,
      dayNumber: nextDay,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selected,
    });
    nextDay++;
  }

  return days;
}

function generateTimeOptions(): string[] {
  const times: string[] = [];
  const startHour = 7;
  const endHour = 19;
  const intervalMinutes = 30;

  for (let hour = startHour; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      const h = pad(hour);
      const m = pad(minute);
      times.push(`${h}:${m}`);
    }
  }

  return times;
}

export function Dashboard({
  userName,
  services,
  appointments,
  onAddService,
  onUpdateService,
  onDeleteService,
  onAddAppointment,
  onUpdateAppointment,
  onDeleteAppointment,
  onToggleAppointmentAttendance,
  onLogout,
}: DashboardProps) {
  const todayStr = getTodayStr();
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const initialView = selectedDate.substring(0, 7);
  const [viewMonth, setViewMonth] = useState(initialView);
  const [showServicesModal, setShowServicesModal] = useState(false);

  const timeOptions = useMemo(() => generateTimeOptions(), []);

  const { totalDay, totalMonth, countDay } = useMemo(() => {
    const month = selectedDate.substring(0, 7);
    let totalDay = 0;
    let totalMonth = 0;
    let countDay = 0;

    appointments.forEach((a) => {
      const s = services.find((s) => s.id === a.serviceId);
      const price =
        typeof a.totalPrice === 'number' && a.totalPrice > 0
          ? a.totalPrice
          : s?.price ?? 0;
      if (a.date === selectedDate) {
        totalDay += price;
        countDay++;
      }
      if (a.date.startsWith(month)) {
        totalMonth += price;
      }
    });

    return { totalDay, totalMonth, countDay };
  }, [appointments, services, selectedDate]);

  const appointmentsOfDay = useMemo(
    () =>
      appointments
        .filter((a) => a.date === selectedDate)
        .sort((a, b) => a.time.localeCompare(b.time)),
    [appointments, selectedDate],
  );

  // --- FORM DE AGENDAMENTO (NOVO / EDIÇÃO) ---
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState(selectedDate);
  const [time, setTime] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  const totalSelectedServicesPrice = useMemo(() => {
    return selectedServiceIds.reduce((total, id) => {
      const s = services.find((srv) => srv.id === id);
      return total + (s?.price ?? 0);
    }, 0);
  }, [selectedServiceIds, services]);

  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!editingAppointmentId) {
      setDate(selectedDate);
    }
  }, [editingAppointmentId, selectedDate]);

  function resetAppointmentForm() {
    setClientName('');
    setPhone('');
    setDate(selectedDate);
    setTime('');
    setServiceId('');
    setSelectedServiceIds([]);
    setPaymentMethod('');
    setNotes('');
    setEditingAppointmentId(null);
  }

  function handleSubmitAppointment(e: FormEvent) {
    e.preventDefault();

    const chosenServiceId = selectedServiceIds[0] || serviceId;

    if (!clientName.trim() || !chosenServiceId || !time || !date) return;

    const selectedServices = selectedServiceIds
      .map((id) => services.find((s) => s.id === id))
      .filter((s): s is Service => !!s);

    const totalPrice =
      selectedServices.length > 0
        ? selectedServices.reduce((acc, s) => acc + s.price, 0)
        : (services.find((s) => s.id === chosenServiceId)?.price ?? 0);

    const data: Omit<Appointment, 'id'> = {
      clientName: clientName.trim(),
      phone: phone.trim(),
      date,
      time,
      serviceId: chosenServiceId,
      paymentMethod: paymentMethod.trim(),
      notes: notes.trim(),
      totalPrice,
      attended: editingAppointmentId
        ? appointments.find((a) => a.id === editingAppointmentId)?.attended ?? false
        : false,
    };

    if (editingAppointmentId) {
      onUpdateAppointment(editingAppointmentId, data, selectedServiceIds);
    } else {
      onAddAppointment(data, selectedServiceIds);
    }

    resetAppointmentForm();
    setSelectedDate(date);
    setViewMonth(date.substring(0, 7));
  }

  function handleEditAppointment(a: Appointment) {
    setEditingAppointmentId(a.id);
    setClientName(a.clientName);
    setPhone(a.phone);
    setDate(a.date);
    setTime(a.time);
    setServiceId(a.serviceId);
    setSelectedServiceIds(a.serviceId ? [a.serviceId] : []);
    setPaymentMethod(a.paymentMethod);
    setNotes(a.notes);

    const form = document.getElementById('form-agendamento');
    form?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleDeleteAppointmentClick(id: string) {
    if (!window.confirm('Deseja realmente excluir este agendamento?')) return;

    onDeleteAppointment(id);
  }

  // --- BLOQUEIO DE HORÁRIOS JÁ OCUPADOS ---
  const bookedTimesForFormDate = useMemo(
    () =>
      appointments
        .filter(
          (a) => a.date === date && a.id !== editingAppointmentId,
        )
        .map((a) => a.time),
    [appointments, date, editingAppointmentId],
  );

  function toggleServiceSelection(id: string) {
    setSelectedServiceIds((prev) => {
      const exists = prev.includes(id);

      if (exists) {
        const updated = prev.filter((sId) => sId !== id);
        setServiceId(updated[0] ?? '');
        return updated;
      }

      if (prev.length >= 5) {
        alert('Você pode selecionar no máximo 5 serviços por agendamento.');
        return prev;
      }

      const updated = [...prev, id];

      if (!serviceId) {
        setServiceId(updated[0]);
      }

      return updated;
    });
  }

  // --- BACKUP (EXPORTAR JSON) ---
  function handleExportBackup() {
    const dataBackup = {
      exportedAt: new Date().toISOString(),
      selectedDate,
      services,
      appointments,
    };

    const blob = new Blob([JSON.stringify(dataBackup, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const today = new Date();
    const fileDate = `${today.getFullYear()}-${pad(
      today.getMonth() + 1,
    )}-${pad(today.getDate())}`;
    a.href = url;
    a.download = `backup-vicky-nails-${fileDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // --- WHATSAPP CONFIRMAÇÃO / LEMBRETE ---
  function sendWhatsAppMessage(
    a: Appointment,
    tipo: 'confirmacao' | 'lembrete',
  ) {
    if (!a.phone) {
      alert('Este agendamento não tem telefone cadastrado.');
      return;
    }

    const service = services.find((s) => s.id === a.serviceId);
    const serviceName = service?.name ?? 'serviço';

    const basePrice = service?.price ?? 0;
    const price =
      typeof a.totalPrice === 'number' && a.totalPrice > 0
        ? a.totalPrice
        : basePrice;

    const [year, month, day] = a.date.split("-");
    const dataStr = `${day}/${month}/${year}`;
    const horaStr = a.time;

    const mensagemConfirmacao = `STUDIO VICTORIA FREITAS

Olá, ${a.clientName}! 

Data: ${dataStr}
Horário: ${horaStr}
Serviço: ${serviceName}
Valor: R$ ${price.toFixed(2).replace('.', ',')}

Qualquer imprevisto é só avisar por aqui, tá bom? 
Endereço:
R. Marechal Floriano Peixoto, 448 - Sala 09, Neves
Em cima do bar Baixo Neves

Formas de pagamento:
- Dinheiro
- PIX: 21 97606-2557 (Victoria de Freitas Liberal - Nubank)
- Cartão (crédito/débito, taxa R$ 4,00)

Recado:
- Tolerância de 15 minutos.
- Em caso de desistência, avise com antecedência.`;

    const mensagemLembrete = `STUDIO VICTORIA FREITAS

Olá, ${a.clientName}! 

Só passando para lembrar do seu agendamento.

Data: ${dataStr}
Horário: ${horaStr}
Serviço: ${serviceName}
Valor: R$ ${price.toFixed(2).replace('.', ',')}

Te espero no horário combinado! 

Endereço:
R. Marechal Floriano Peixoto, 448 - Sala 09, Neves
Em cima do bar Baixo Neves
`;

    const texto = tipo === 'confirmacao'
      ? mensagemConfirmacao
      : mensagemLembrete;

    const numero = a.phone.replace(/\D/g, '');
    const url = `https://wa.me/55${numero}?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
  }

  function handleSendWhatsAppConfirm(a: Appointment) {
    sendWhatsAppMessage(a, 'confirmacao');
  }

  function handleSendWhatsAppReminder(a: Appointment) {
    sendWhatsAppMessage(a, 'lembrete');
  }

  // --- SERVIÇOS (MODAL) ---
  const [serviceName, setServiceName] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [serviceDuration, setServiceDuration] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [isEditingService, setIsEditingService] = useState(false);

  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedServiceId) ?? null,
    [services, selectedServiceId],
  );

  function resetServiceForm() {
    setServiceName('');
    setServicePrice('');
    setServiceDuration('');
    setServiceDescription('');
    setIsEditingService(false);
  }
    function handleSelectService(id: string) {
    setSelectedServiceId((prev) => (prev === id ? null : id));
    // sempre que clicar num serviço da lista, saímos do modo edição
    setIsEditingService(false);
  }


  function handleNewService(e: FormEvent) {
    e.preventDefault();
    if (!serviceName.trim() || !servicePrice || !serviceDuration) return;

    const price = Number(servicePrice.replace(',', '.'));
    const duration = Number(serviceDuration);
    if (isNaN(price) || isNaN(duration)) return;

    const data: Omit<Service, 'id'> = {
      name: serviceName.trim(),
      price,
      duration,
      description: serviceDescription.trim(),
    };

    if (isEditingService && selectedService) {
      onUpdateService(selectedService.id, data);
    } else {
      onAddService(data);
    }

    resetServiceForm();
    setSelectedServiceId(null);
  }

  function handleClickAddServiceButton() {
    const form = document.getElementById('service-form') as HTMLFormElement | null;
    if (form) {
      form.requestSubmit();
    }
  }

  function handleClickEditService() {
    if (!selectedService) return;
    setIsEditingService(true);
    setServiceName(selectedService.name);
    setServicePrice(String(selectedService.price));
    setServiceDuration(String(selectedService.duration));
    setServiceDescription(selectedService.description ?? '');
    const el = document.getElementById('service-form');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleClickDeleteService() {
    if (!selectedService) return;

    const hasAppointments = appointments.some(
      (a) => a.serviceId === selectedService.id,
    );

    const msg = hasAppointments
      ? 'Este serviço já possui agendamentos vinculados. Tem certeza que deseja excluir?'
      : 'Tem certeza que deseja excluir este serviço?';

    if (!window.confirm(msg)) return;

    onDeleteService(selectedService.id);
    setSelectedServiceId(null);
  }

  const [viewYearNumber, viewMonthNumber] = viewMonth
    .split('-')
    .map((v) => Number(v));

  const monthLabel = new Date(viewYearNumber, viewMonthNumber - 1, 1).toLocaleDateString(
    'pt-BR',
    { month: 'long', year: 'numeric' },
  );

  function goMonth(delta: number) {
    const d = new Date(viewYearNumber, viewMonthNumber - 1 + delta, 1);
    const newMonthStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    setViewMonth(newMonthStr);
  }

  function handleSelectDay(day: CalendarDay) {
    setSelectedDate(day.dateStr);
    setDate(day.dateStr);
  }

  const calendarDays = useMemo(
    () => generateCalendarDays(viewYearNumber, viewMonthNumber, selectedDate, todayStr),
    [viewYearNumber, viewMonthNumber, selectedDate, todayStr],
  );

  const [selYear, selMonth, selDay] = selectedDate.split('-').map(Number);
  const dateObj = new Date(selYear, selMonth - 1, selDay);
  const dateHuman = dateObj.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="dashboard-page">
      <div className="dashboard-shell">
        <header className="dashboard-topbar">
          <div className="topbar-left">
            <div className="topbar-avatar">💅</div>
            <div className="topbar-title">
              <span className="topbar-title-main">Nails Designer</span>
              <span className="topbar-title-sub">
                Olá, {userName || 'Nails'}{' '}
              </span>
            </div>
          </div>

          <div className="topbar-actions">
            <button
              className="btn-ghost"
              type="button"
              onClick={() => setShowServicesModal(true)}
            >
              ⚙ Serviços
            </button>
            <button
              className="btn-ghost"
              type="button"
              onClick={handleExportBackup}
            >
              ⭳ Backup
            </button>
            <button className="btn-outline" type="button" onClick={onLogout}>
              ⇢ Sair
            </button>
          </div>
        </header>

        <main className="dashboard-grid">
          {/* COLUNA ESQUERDA */}
          <section className="left-column">
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Resumo do dia</div>
                  <div className="card-subtitle">{dateHuman}</div>
                </div>
                <div className="summary-values">
                  <div className="summary-value">
                    <span>Agendamentos</span>
                    <strong>{countDay}</strong>
                  </div>
                  <div className="summary-value">
                    <span>Faturamento do dia</span>
                    <strong>R$ {totalDay.toFixed(2).replace('.', ',')}</strong>
                  </div>
                </div>
              </div>

              <div className="summary-row">
                <span>Faturamento no mês</span>
                <span className="badge-money">
                  R$ {totalMonth.toFixed(2).replace('.', ',')}
                </span>
              </div>

              <div className="calendar-header-row">
                <div className="calendar-month-label">
                  {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
                </div>
                <div className="calendar-nav">
                  <button type="button" onClick={() => goMonth(-1)}>
                    ‹
                  </button>
                  <button type="button" onClick={() => goMonth(1)}>
                    ›
                  </button>
                </div>
              </div>

              <div className="calendar-grid">
                <div className="calendar-weekdays">
                  <span>Dom</span>
                  <span>Seg</span>
                  <span>Ter</span>
                  <span>Qua</span>
                  <span>Qui</span>
                  <span>Sex</span>
                  <span>Sáb</span>
                </div>

                <div className="calendar-weeks">
                  {Array.from({ length: 6 }).map((_, weekIndex) => (
                    <div key={weekIndex} className="calendar-week-row">
                      {calendarDays
                        .slice(weekIndex * 7, weekIndex * 7 + 7)
                        .map((day) => {
                          const hasAppointments = appointments.some(
                            (a) => a.date === day.dateStr,
                          );
                          return (
                            <button
                              key={day.dateStr}
                              type="button"
                              className={[
                                'calendar-day',
                                day.isCurrentMonth ? 'is-current-month' : 'is-other-month',
                                day.isToday ? 'is-today' : '',
                                day.isSelected ? 'is-selected' : '',
                                hasAppointments ? 'has-appointments' : '',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                              onClick={() => handleSelectDay(day)}
                            >
                              <span className="calendar-day-number">
                                {day.dayNumber}
                              </span>
                              {hasAppointments && (
                                <span className="calendar-day-dot" />
                              )}
                            </button>
                          );
                        })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Agendamentos do dia</div>
                  <div className="card-subtitle">
                    {appointmentsOfDay.length === 0
                      ? 'Nenhum horário marcado'
                      : `${appointmentsOfDay.length} horário(s) marcados`}
                  </div>
                </div>
              </div>

              {appointmentsOfDay.length === 0 ? (
                <div className="empty-day">
                  <div className="empty-day-icon">🕒</div>
                  <div>Nenhum agendamento para este dia</div>
                  <div>Clique no calendário e preencha o formulário abaixo</div>
                </div>
              ) : (
                <ul className="appointments-list">
                  {appointmentsOfDay.map((a) => {
                    const service = services.find((s) => s.id === a.serviceId);
                    const isAttended = !!a.attended;
                    const value =
                      typeof a.totalPrice === 'number' && a.totalPrice > 0
                        ? a.totalPrice
                        : service?.price ?? 0;

                    return (
                      <li key={a.id} className="appointment-item">
                        <div className="appointment-top">
                          <span>
                            <strong>{a.time}</strong> — {a.clientName}
                          </span>
                          {a.phone && <span>{a.phone}</span>}
                        </div>
                        <div className="appointment-bottom">
                          {service?.name || 'Serviço'} · R${' '}
                          {value.toFixed(2).replace('.', ',')}{' '}
                          {a.paymentMethod && `· ${a.paymentMethod}`}
                        </div>
                        {a.notes && (
                          <div className="appointment-notes">
                            Obs.: {a.notes}
                          </div>
                        )}
                        <div className="appointment-actions">
                          <button
                            type="button"
                            className={isAttended ? 'btn-chip success' : 'btn-chip'}
                            onClick={() => onToggleAppointmentAttendance(a.id)}
                          >
                            {isAttended ? 'Atendido' : 'Marcar presença'}
                          </button>
                          <button
                            type="button"
                            className="btn-chip"
                            onClick={() => handleSendWhatsAppConfirm(a)}
                          >
                            WhatsApp (confirmação)
                          </button>
                          <button
                            type="button"
                            className="btn-chip"
                            onClick={() => handleSendWhatsAppReminder(a)}
                          >
                            WhatsApp (lembrete)
                          </button>
                          <button
                            type="button"
                            className="btn-chip"
                            onClick={() => handleEditAppointment(a)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn-chip danger"
                            onClick={() => handleDeleteAppointmentClick(a.id)}
                          >
                            Excluir
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* COLUNA DIREITA */}
          <section className="right-column">
            <div className="side-card" id="form-agendamento">
              <h4 className="card-title" style={{ marginTop: 16 }}>
                {editingAppointmentId ? 'Editar agendamento' : 'Novo agendamento'}
              </h4>
              <form onSubmit={handleSubmitAppointment} className="form-column">
                <div className="form-group">
                  <label className="form-label">Nome da cliente</label>
                  <div className="input-wrapper">
                    <span className="input-icon">💁‍♀️</span>
                    <input
                      className="form-input"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Ex: Maria Silva"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Telefone / WhatsApp</label>
                  <div className="input-wrapper">
                    <span className="input-icon">📞</span>
                    <input
                      className="form-input"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(21) 99999-9999"
                    />
                  </div>
                </div>

                <div className="form-two-columns">
                  <div className="form-group">
                    <label className="form-label">Data</label>
                    <input
                      className="form-date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Horário</label>
                    <select
                      className="form-select"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    >
                      <option value="">Selecione o horário</option>
                      {timeOptions.map((t) => {
                        const isBusy = bookedTimesForFormDate.includes(t);
                        return (
                          <option key={t} value={t} disabled={isBusy}>
                            {t} {isBusy ? '(ocupado)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Serviços (selecione até 5)</label>

                  <div className="services-multi-select">
                    {services.length === 0 ? (
                      <span>Nenhum serviço cadastrado ainda.</span>
                    ) : (
                      <ul className="services-multi-select-list">
                        {services.map((s) => {
                          const checked = selectedServiceIds.includes(s.id);
                          return (
                            <li
                              key={s.id}
                              className={
                                'services-multi-select-item' +
                                (checked ? ' services-multi-select-item-selected' : '')
                              }
                            >
                              <label className="services-multi-select-label">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleServiceSelection(s.id)}
                                />
                                <span>
                                  {s.name} — R$ {s.price.toFixed(2).replace('.', ',')}
                                </span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  <div className="services-multi-select-total">
                    Total selecionado:{' '}
                    <strong>
                      R$ {totalSelectedServicesPrice.toFixed(2).replace('.', ',')}
                    </strong>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Forma de pagamento</label>
                  <select
                    className="form-select"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="">Selecione</option>
                    <option>Pix</option>
                    <option>Dinheiro</option>
                    <option>Crédito (1x)</option>
                    <option>Débito</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Observações</label>
                  <textarea
                    className="form-textarea"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: prefere esmalte clarinho, cliente nova, etc."
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-primary">
                    {editingAppointmentId ? 'Salvar alterações' : 'Agendar'}
                  </button>
                  {editingAppointmentId && (
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={resetAppointmentForm}
                    >
                      Cancelar edição
                    </button>
                  )}
                </div>
              </form>
            </div>
          </section>
        </main>

        {showServicesModal && (
          <div className="modal-backdrop" onClick={() => setShowServicesModal(false)}>
            <div
              className="modal-panel"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <header className="modal-header">
                <div>
                  <div className="modal-title">Gerenciar Serviços</div>
                  <div className="services-counter">
                    {services.length} serviços cadastrados
                  </div>
                </div>
              </header>

              <div className="modal-body">
                <form
                  id="service-form"
                  onSubmit={handleNewService}
                  className="service-form-column"
                >
                  <label>Nome do serviço</label>
                  <input
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    placeholder="Ex: Alongamento de fibra"
                  />

                  <label>Valor</label>
                  <input
                    value={servicePrice}
                    onChange={(e) => setServicePrice(e.target.value)}
                    placeholder="Ex: 90"
                  />

                  <label>Duração (minutos)</label>
                  <input
                    value={serviceDuration}
                    onChange={(e) => setServiceDuration(e.target.value)}
                    placeholder="Ex: 120"
                  />

                  <label>Descrição (opcional)</label>
                  <textarea
                    value={serviceDescription}
                    onChange={(e) => setServiceDescription(e.target.value)}
                    placeholder="Ex: Manutenção incluída em até 15 dias"
                    rows={3}
                  />
                </form>

                <div className="services-actions-row">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleClickAddServiceButton}
                  >
                    {isEditingService ? 'Salvar alterações' : 'Adicionar serviço'}
                  </button>
                  <button
                    type="button"
                    className="btn-outline"
                    disabled={!selectedService}
                    onClick={handleClickEditService}
                  >
                    Editar selecionado
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    disabled={!selectedService}
                    onClick={handleClickDeleteService}
                  >
                    Excluir selecionado
                  </button>
                </div>

                <ul className="services-list">
                  {services.map((s) => (
                    <li
                      key={s.id}
                      className={
                        'service-item' +
                        (selectedServiceId === s.id ? ' service-item-selected' : '')
                      }
                      onClick={() => handleSelectService(s.id)}
                    >
                      <div className="service-item-info">
                        <strong>{s.name}</strong>
                        <span className="service-item-price">
                          R$ {s.price.toFixed(2).replace('.', ',')} · {s.duration} min
                        </span>
                        {s.description && (
                          <span className="service-item-desc">{s.description}</span>
                        )}
                      </div>
                    </li>
                  ))}
                  {services.length === 0 && (
                    <li className="service-item">
                      Nenhum serviço cadastrado ainda. Use o formulário acima para
                      adicionar.
                    </li>
                  )}
                </ul>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleClickAddServiceButton}
                >
                  {isEditingService ? 'Salvar serviço' : 'Adicionar serviço'}
                </button>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setShowServicesModal(false)}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
