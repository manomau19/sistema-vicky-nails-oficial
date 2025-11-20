import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Appointment, Service } from '../types';

type DashboardProps = {
  userName: string;
  services: Service[];
  appointments: Appointment[];
  onAddService: (service: Omit<Service, 'id'>) => void;
  onUpdateService: (id: string, service: Omit<Service, 'id'>) => void;
  onDeleteService: (id: string) => void;
  onAddAppointment: (appointment: Omit<Appointment, 'id'>) => void;
  onUpdateAppointment: (id: string, appointment: Omit<Appointment, 'id'>) => void;
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

function pad(num: number): string {
  return num.toString().padStart(2, '0');
}

function generateTimeOptions(): string[] {
  const result: string[] = [];
  let hour = 7;
  let minute = 30;

  while (true) {
    result.push(`${pad(hour)}:${pad(minute)}`);
    if (hour === 19 && minute === 30) break;
    minute += 30;
    if (minute === 60) {
      minute = 0;
      hour++;
    }
  }
  return result;
}

function getTodayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate(),
  )}`;
}

function getCalendarDays(
  monthStr: string,
  selected: string,
  todayStr: string,
): CalendarDay[] {
  const [year, month] = monthStr.split('-').map((n) => Number(n));
  const firstOfMonth = new Date(year, month - 1, 1);
  const firstWeekday = firstOfMonth.getDay();
  const lastOfMonth = new Date(year, month, 0);
  const daysInMonth = lastOfMonth.getDate();

  const prevLast = new Date(year, month - 1, 0);
  const prevYear = prevLast.getFullYear();
  const prevMonthNum = prevLast.getMonth() + 1;
  const prevDays = prevLast.getDate();

  const nextFirst = new Date(year, month, 1);
  const nextYear = nextFirst.getFullYear();
  const nextMonthNum = nextFirst.getMonth() + 1;

  const days: CalendarDay[] = [];

  // Dias do mês anterior
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const dayNumber = prevDays - i;
    const dateStr = `${prevYear}-${pad(prevMonthNum)}-${pad(dayNumber)}`;
    days.push({
      dateStr,
      dayNumber,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selected,
    });
  }

  // Dias do mês atual
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
      const price = s?.price ?? 0;
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
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!editingAppointmentId) {
      setDate(selectedDate);
    }
  }, [selectedDate, editingAppointmentId]);

  function resetAppointmentForm() {
    setClientName('');
    setPhone('');
    setDate(selectedDate);
    setTime('');
    setServiceId('');
    setPaymentMethod('');
    setNotes('');
    setEditingAppointmentId(null);
  }

  function handleSubmitAppointment(e: FormEvent) {
    e.preventDefault();
    if (!clientName.trim() || !serviceId || !time || !date) return;

    const data: Omit<Appointment, 'id'> = {
      clientName: clientName.trim(),
      phone: phone.trim(),
      date,
      time,
      serviceId,
      paymentMethod: paymentMethod.trim(),
      notes: notes.trim(),
    };

    if (editingAppointmentId) {
      onUpdateAppointment(editingAppointmentId, data);
    } else {
      onAddAppointment(data);
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
    setPaymentMethod(a.paymentMethod);
    setNotes(a.notes);

    const form = document.getElementById('form-agendamento');
    form?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleDeleteAppointmentClick(id: string) {
    if (!window.confirm('Deseja realmente excluir este agendamento?')) return;

    onDeleteAppointment(id);

    if (editingAppointmentId === id) {
      resetAppointmentForm();
    }
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

  // --- BACKUP (EXPORTAR JSON) ---
  function handleExportBackup() {
    const dataBackup = {
      exportedAt: new Date().toISOString(),
      userName,
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
    const price = service?.price ?? 0;

    const dateObj = new Date(a.date + 'T' + a.time);
    const dataStr = dateObj.toLocaleDateString('pt-BR');
    const horaStr = a.time;

    const mensagens = {
      confirmacao: ` ✨STUDIO VICTORIA FREITAS✨
      
      Olá, *${a.clientName}*! 💅✨

📅 Data: ${dataStr}
⏰ Horário: ${horaStr}
💖 Serviço: ${serviceName}
💵 Valor: R$ ${price.toFixed(2).replace('.', ',')}

✅Marcadinho minha gatinha.    *Aguardo anciosamente 😊 

📍R. Marechal Floriano Peixoto 
  n°448,Neves- sala 09
 Ponto de referência: encima do bar Baixo Neves

✨METODOS DE PAGAMENTO :
Dinheiro,Qr Code 
Cartão: crédito e débito
(taxinha de $4)
Pix:21 97606-2557 (celular)
 Victoria de Freitas Liberal - Nubank

🚨RECADO🚨
-Tolerância de 15 minutos.
-Em caso de desistencia me avise
o quanto antes,não deixe pra cima da hora.`,

      lembrete: `Olá, *${a.clientName}*! 💅✨

Passando para te lembrar do seu atendimento amanhã ❤️
📅 Data: ${dataStr}
⏰ Horário: ${horaStr}
💖 Serviço: ${serviceName}

Qualquer imprevisto, só avisar!
Até amanhã 😊`,
    };

    const msg = encodeURIComponent(mensagens[tipo]);
    const cleanPhone = a.phone.replace(/\D/g, '');
    const url = `https://wa.me/55${cleanPhone}?text=${msg}`;
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

    if (isEditingService && selectedServiceId) {
      onUpdateService(selectedServiceId, data);
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
      ? 'Este serviço possui agendamentos. Tem certeza que deseja excluir?'
      : 'Tem certeza que deseja excluir este serviço?';

    if (!window.confirm(msg)) return;

    onDeleteService(selectedService.id);
    setSelectedServiceId(null);
    resetServiceForm();
  }

  function handleSelectService(id: string) {
    setSelectedServiceId((prev) => (prev === id ? null : id));
  }

  const [selYear, selMonth, selDay] = selectedDate.split('-').map(Number);
  const dateObj = new Date(selYear, selMonth - 1, selDay);
  const dateHuman = dateObj.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const calendarDays = getCalendarDays(viewMonth, selectedDate, todayStr);
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
    const monthStr = day.dateStr.substring(0, 7);
    setViewMonth(monthStr);
  }

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
          {/* CARD CALENDÁRIO */}
          <section className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Calendário</div>
                <div className="card-subtitle">
                  {countDay} agendamentos neste dia
                </div>
              </div>
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
                        const classes = ['calendar-day'];
                        if (!day.isCurrentMonth) classes.push('calendar-day-out');
                        if (day.isToday) classes.push('calendar-day-today');
                        if (day.isSelected) classes.push('calendar-day-selected');

                        return (
                          <div
                            key={day.dateStr}
                            className={classes.join(' ')}
                            onClick={() => handleSelectDay(day)}
                          >
                            {day.dayNumber}
                          </div>
                        );
                      })}
                  </div>
                ))}
              </div>
            </div>

            <div className="calendar-footer">
              <div className="calendar-footer-row">
                <span>Total de agendamentos do dia:</span>
                <strong>{countDay}</strong>
              </div>
              <div className="calendar-footer-row">
                <span>Faturamento do dia:</span>
                <strong>R$ {totalDay.toFixed(2).replace('.', ',')}</strong>
              </div>
              <div className="calendar-footer-row">
                <span>Faturamento do mês:</span>
                <strong>R$ {totalMonth.toFixed(2).replace('.', ',')}</strong>
              </div>
            </div>
          </section>

          {/* CARD AGENDAMENTOS + FORM */}
          <section className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Agendamentos do Dia</div>
                <div className="card-subtitle">{dateHuman}</div>
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
                        {service?.price
                          ? service.price.toFixed(2).replace('.', ',')
                          : '0,00'}{' '}
                        {a.paymentMethod && `· ${a.paymentMethod}`}
                      </div>
                      {a.notes && (
                        <div className="appointment-notes">
                          Obs.: {a.notes}
                        </div>
                      )}
                      <div className="appointment-actions-row">
                        <button
                          type="button"
                          className="btn-small"
                          onClick={() => handleEditAppointment(a)}
                        >
                          ✏ Editar
                        </button>
                        <button
                          type="button"
                          className="btn-small btn-danger"
                          onClick={() => handleDeleteAppointmentClick(a.id)}
                        >
                          🗑 Excluir
                        </button>
                        <button
                          type="button"
                          className="btn-small"
                          onClick={() => handleSendWhatsAppConfirm(a)}
                        >
                          💬 Confirmar
                        </button>
                        <button
                          type="button"
                          className="btn-small"
                          onClick={() => handleSendWhatsAppReminder(a)}
                        >
                          🔔 Lembrete
                        </button>
                        <button
                          type="button"
                          className={
                            'btn-small ' + (isAttended ? 'btn-small-success' : '')
                          }
                          onClick={() => onToggleAppointmentAttendance(a.id)}
                        >
                          {isAttended
                            ? 'Presença confirmada'
                            : 'Confirmar presença'}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

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

                <div className="form-group">
                  <label className="form-label">Data do serviço</label>
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

                <div className="form-group">
                  <label className="form-label">Serviço</label>
                  <select
                    className="form-select"
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                  >
                    <option value="">Selecione um serviço</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} — R$ {s.price.toFixed(2).replace('.', ',')}
                      </option>
                    ))}
                  </select>
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
                    <option>Crédito (2x)</option>
                    <option>Débito</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Observações</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Ex: Cliente prefere esmalte nude, alongamento mais curto..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn-primary">
                  {editingAppointmentId ? 'Salvar alterações' : 'Salvar agendamento'}
                </button>
              </form>
            </div>
          </section>
        </main>
      </div>

      {showServicesModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowServicesModal(false)}
        >
          <div
            className="modal-sheet"
            onClick={(e) => e.stopPropagation()}
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

                <label>Descrição do serviço</label>
                <textarea
                  value={serviceDescription}
                  onChange={(e) => setServiceDescription(e.target.value)}
                  placeholder="Detalhes do serviço"
                />

                <button type="submit" style={{ display: 'none' }}>
                  hidden-submit
                </button>
              </form>

              <ul className="services-list">
                {services.map((s) => (
                  <li
                    key={s.id}
                    className={
                      'service-item' +
                      (s.id === selectedServiceId ? ' service-item-selected' : '')
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
                    <span>Nenhum serviço cadastrado ainda.</span>
                  </li>
                )}
              </ul>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-small"
                onClick={handleClickAddServiceButton}
              >
                Adicionar
              </button>
              <button
                type="button"
                className="btn-small"
                disabled={!selectedServiceId}
                onClick={handleClickEditService}
              >
                ✎ Editar
              </button>
              <button
                type="button"
                className="btn-small btn-danger"
                disabled={!selectedServiceId}
                onClick={handleClickDeleteService}
              >
                🗑 Excluir
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
  );
}
