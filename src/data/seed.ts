import type {
  AppData,
  Absence,
  Customer,
  CustomerIssue,
  Employee,
  Material,
  MaterialRequest,
  Shift,
  SystemRole,
  Ticket,
  TimeEntry,
} from '../types';
import { uid } from '../utils/format';
import { addDays, isoDate, mondayOf } from '../utils/date';
import { DEFAULT_PERMISSIONS, DEFAULT_PROFILE_EDITABLE } from './permissions';
import { makeDefaultServices } from './services';

/** Shared demo login password for all seeded employees (mock auth only, no real backend). */
const DEMO_PASSWORD = 'demo1234';

/** Rough coordinate offset (for demo seed data only) so mock GPS points aren't exactly on top of the location. */
function offsetCoord(lat: number, lng: number, meters: number): { lat: number; lng: number } {
  const dLat = meters / 111320;
  const dLng = meters / (111320 * Math.cos((lat * Math.PI) / 180));
  return { lat: lat + dLat, lng: lng + dLng };
}

const DEFAULT_TASKS = [
  'Böden reinigen / wischen',
  'Staub wischen',
  'Sanitäranlagen reinigen',
  'Mülleimer leeren',
  'Fenster & Glasflächen (Sichtbereich)',
  'Küche / Teeküche reinigen',
];

function makeEmployee(
  name: string,
  role: string,
  customerIds: string[],
  pin: string,
  systemRole?: SystemRole,
  emailOverride?: string
): Employee {
  const emailLocal = name
    .toLowerCase()
    .replace(/ /g, '.')
    .replace(/[äöü]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue' }[c] ?? c))
    .replace(/ß/g, 'ss');
  return {
    id: uid(),
    name,
    role,
    systemRole: systemRole ?? 'mitarbeiter',
    email: emailOverride ?? `${emailLocal}@alpen-gastro.demo`,
    phone: `+41 79 ${Math.floor(100 + Math.random() * 899)} ${Math.floor(10 + Math.random() * 89)} ${Math.floor(
      10 + Math.random() * 89
    )}`,
    status: 'aktiv',
    pin,
    password: DEMO_PASSWORD,
    startDate: '2023-03-01',
    customerIds,
  };
}

interface CustomerSeed {
  name: string;
  address: string;
  lat: number;
  lng: number;
  radius: number;
  geofenceEnabled?: boolean;
  contact: string;
  phone: string;
  type?: string;
  area?: number;
  interval?: string;
  keyNumber?: string;
  accessCode?: string;
  accessFrom?: string;
  accessTo?: string;
  accessNotes?: string;
  contractStart?: string;
  monthlyHours?: number;
  hourlyRate?: number;
  tasks?: string[];
  issues?: CustomerIssue[];
}

function makeCustomer(o: CustomerSeed): Customer {
  return {
    id: uid(),
    name: o.name,
    address: o.address,
    lat: o.lat,
    lng: o.lng,
    radius: o.radius,
    geofenceEnabled: o.geofenceEnabled ?? true,
    contact: o.contact,
    phone: o.phone,
    active: true,
    notes: '',
    type: o.type || 'Büro',
    area: o.area || 120,
    interval: o.interval || '2x wöchentlich',
    keyNumber: o.keyNumber || '',
    accessCode: o.accessCode || '',
    accessFrom: o.accessFrom || '',
    accessTo: o.accessTo || '',
    accessNotes: o.accessNotes || '',
    contractStart: o.contractStart || '2024-01-01',
    monthlyHours: o.monthlyHours || 20,
    hourlyRate: o.hourlyRate || 38,
    tasks: (o.tasks || DEFAULT_TASKS).map((t) => ({ id: uid(), label: t, done: false })),
    issues: o.issues || [],
  };
}

export function seedData(): AppData {
  const today = new Date();

  const c1 = makeCustomer({
    name: 'Restaurant Seeblick',
    address: 'Seepromenade 4, 6003 Luzern',
    lat: 47.0502,
    lng: 8.3093,
    radius: 80,
    contact: 'M. Brunner',
    phone: '+41 41 210 44 55',
    type: 'Gastronomie',
    area: 340,
    interval: 'täglich',
    keyNumber: 'K-101',
    accessCode: '4471#',
    accessFrom: '05:30',
    accessTo: '09:30',
    accessNotes: 'Zugang über Lieferanteneingang rückseitig, Alarmanlage vor Betreten deaktivieren.',
    contractStart: '2022-04-01',
    monthlyHours: 65,
    hourlyRate: 42,
    tasks: [
      'Küche & Gastraum reinigen',
      'Böden wischen & polieren',
      'Sanitäranlagen (Gäste-WC) reinigen',
      'Fenster & Glasflächen',
      'Terrasse kehren',
      'Mülleimer leeren & Container reinigen',
    ],
    issues: [
      {
        id: uid(),
        date: isoDate(addDays(today, -6)),
        text: 'Bodenbelag im Eingangsbereich stark verschmutzt, Nachreinigung nötig.',
        status: 'erledigt',
        severity: 'mittel',
      },
    ],
  });
  const c2 = makeCustomer({
    name: 'Alpen Stube',
    address: 'Höheweg 22, 3800 Interlaken',
    lat: 46.6863,
    lng: 7.8632,
    radius: 70,
    contact: 'S. Kaufmann',
    phone: '+41 33 822 11 09',
    type: 'Gastronomie',
    area: 210,
    interval: 'täglich',
    keyNumber: 'K-204',
    accessCode: '8802*',
    accessFrom: '06:00',
    accessTo: '10:00',
    accessNotes: 'Schlüssel bei Nachtportier hinterlegt.',
    contractStart: '2023-01-15',
    monthlyHours: 48,
    hourlyRate: 40,
    issues: [
      {
        id: uid(),
        date: isoDate(addDays(today, -1)),
        text: 'Seifenspender im Personal-WC defekt.',
        status: 'offen',
        severity: 'niedrig',
      },
    ],
  });
  const c3 = makeCustomer({
    name: 'Bergrestaurant Diavolezza',
    address: 'Bergstation, 7504 Pontresina',
    lat: 46.4364,
    lng: 9.9506,
    radius: 150,
    contact: 'L. Testa',
    phone: '+41 81 842 63 33',
    type: 'Gastronomie',
    area: 280,
    interval: 'wöchentlich',
    keyNumber: 'K-330',
    accessFrom: '07:30',
    accessTo: '16:00',
    accessNotes: 'Zugang nur mit Bergbahn, letzte Fahrt beachten.',
    contractStart: '2023-06-01',
    monthlyHours: 24,
    hourlyRate: 45,
  });
  const c4 = makeCustomer({
    name: 'Event & Catering Zentrale',
    address: 'Sihlquai 131, 8005 Zürich',
    lat: 47.3878,
    lng: 8.5307,
    radius: 100,
    contact: 'N. Frei',
    phone: '+41 44 271 88 20',
    type: 'Lager / Küche',
    area: 450,
    interval: 'nach Vereinbarung',
    keyNumber: 'K-450',
    accessCode: '2290',
    accessNotes: 'Zutritt nur nach Voranmeldung über Empfang.',
    contractStart: '2024-02-01',
    monthlyHours: 16,
    hourlyRate: 39,
    issues: [
      {
        id: uid(),
        date: isoDate(addDays(today, -3)),
        text: 'Grundreinigung Lagerraum nach Anlass ausstehend.',
        status: 'in Bearbeitung',
        severity: 'hoch',
      },
    ],
  });
  const customers = [c1, c2, c3, c4];
  const services = makeDefaultServices();
  const [svcUnterhalt, svcFenster, svcRasen, svcTreppenhaus, svcGrund, svcBuero, svcWinter] = services;

  const e1 = makeEmployee('Sandro Wyss', 'Küchenchef', [c1.id, c4.id], '4471');
  const e2 = makeEmployee('Lea Hofmann', 'Chef de Rang', [c1.id], '1298');
  const e3 = makeEmployee('Marco Bianchi', 'Barkeeper', [c2.id], '5560');
  const e4 = makeEmployee('Priska Widmer', 'Servicefachkraft', [c2.id, c3.id], '3345');
  const e5 = makeEmployee('Jonas Schneider', 'Koch', [c2.id, c1.id], '8802');
  const e6 = makeEmployee('Nina Steiner', 'Empfangsmitarbeiterin', [c1.id], '6671');
  const e7 = makeEmployee('Aleksandar Popović', 'Koch', [c3.id], '2290');
  const e8 = makeEmployee('Tanja Egger', 'Housekeeping', [c1.id, c2.id], '7743');
  const e9 = makeEmployee('David Meier', 'Barkeeper', [c4.id, c1.id], '9012');
  const eAdmin = makeEmployee('Laura Keller', 'Administrator', [], '0001', 'admin', 'admin@monora.ch');
  const eManager = makeEmployee('Marco Baumann', 'Manager Service', [c1.id, c2.id], '0002', 'manager', 'manager@monora.ch');
  const eStaff = makeEmployee('Luca Meier', 'Service Mitarbeiter', [c1.id], '0003', 'mitarbeiter', 'mitarbeiter@monora.ch');
  const employees = [e1, e2, e3, e4, e5, e6, e7, e8, e9, eAdmin, eManager, eStaff];

  const monday = mondayOf(today);
  const shifts: Shift[] = [];
  const dow = (today.getDay() + 6) % 7;
  function addShift(
    e: Employee | null,
    c: Customer,
    dOff: number,
    st: string,
    en: string,
    pause: number,
    status: Shift['status'],
    notes?: string,
    serviceId: string | null = null
  ) {
    shifts.push({
      id: uid(),
      employeeId: e ? e.id : null,
      customerId: c.id,
      serviceId,
      date: isoDate(addDays(monday, dOff)),
      start: st,
      end: en,
      pause: pause || 0,
      status: status || 'geplant',
      notes: notes || '',
    });
  }
  // Montag
  addShift(e1, c1, 0, '06:30', '14:30', 30, 'bestätigt', 'Wochenstart, Mise en Place komplett', svcUnterhalt.id);
  addShift(e2, c1, 0, '10:30', '18:00', 30, 'bestätigt');
  addShift(e6, c1, 0, '08:00', '16:00', 30, 'geplant', undefined, svcBuero.id);
  addShift(e3, c2, 0, '16:00', '23:30', 30, 'geplant');
  addShift(e8, c1, 0, '06:00', '09:00', 0, 'bestätigt', undefined, svcTreppenhaus.id);
  // Dienstag
  addShift(e1, c1, 1, '06:30', '14:30', 30, 'bestätigt');
  addShift(e5, c2, 1, '11:00', '19:00', 30, 'geplant', undefined, svcRasen.id);
  addShift(e4, c2, 1, '11:00', '19:00', 30, 'geplant', undefined, svcWinter.id);
  addShift(null, c3, 1, '08:00', '16:00', 30, 'offen', 'Vertretung für Krankheitsausfall gesucht');
  addShift(e9, c4, 1, '17:00', '23:00', 30, 'geplant', 'Firmenanlass, 80 Personen');
  // Mittwoch
  addShift(e1, c1, 2, '06:30', '14:30', 30, 'bestätigt');
  addShift(e7, c3, 2, '08:00', '16:00', 30, 'bestätigt');
  addShift(e2, c1, 2, '17:00', '23:00', 30, 'geplant');
  addShift(e2, c1, 2, '10:00', '15:00', 0, 'geplant', 'Doppelbelegung – bitte prüfen');
  addShift(e6, c1, 2, '08:00', '16:00', 30, 'geplant');
  // Donnerstag
  addShift(e5, c1, 3, '06:30', '14:30', 30, 'geplant');
  addShift(e4, c3, 3, '08:00', '16:00', 30, 'bestätigt');
  addShift(e3, c2, 3, '16:00', '23:30', 30, 'geplant');
  addShift(null, c1, 3, '17:00', '23:00', 30, 'offen', 'Zusatzschicht wegen Reservationen');
  addShift(e8, c2, 3, '14:00', '17:00', 0, 'bestätigt');
  // Freitag
  addShift(e1, c4, 4, '09:00', '22:00', 60, 'bestätigt', 'Catering Hochzeit Zürich', svcGrund.id);
  addShift(e9, c4, 4, '16:00', '23:59', 30, 'bestätigt');
  addShift(e2, c1, 4, '17:00', '23:30', 30, 'geplant');
  addShift(e5, c2, 4, '17:00', '23:00', 30, 'geplant');
  addShift(e7, c3, 4, '08:00', '16:00', 30, 'bestätigt');
  addShift(null, c2, 4, '17:00', '23:30', 30, 'offen');
  // Samstag
  addShift(e1, c1, 5, '10:00', '15:00', 30, 'geplant');
  addShift(e2, c1, 5, '10:00', '15:00', 30, 'geplant');
  addShift(e3, c2, 5, '16:00', '23:59', 30, 'bestätigt');
  addShift(e4, c2, 5, '16:00', '23:00', 30, 'bestätigt');
  addShift(e7, c3, 5, '08:00', '16:00', 30, 'geplant', 'Wochenende Hochbetrieb');
  addShift(e9, c1, 5, '17:00', '23:30', 30, 'geplant');
  // Sonntag
  addShift(e5, c1, 6, '09:00', '15:00', 30, 'geplant');
  addShift(e6, c1, 6, '09:00', '14:00', 15, 'geplant');
  addShift(e8, c1, 6, '06:00', '09:00', 0, 'bestätigt');
  addShift(null, c4, 6, '11:00', '16:00', 30, 'offen', 'Brunch-Event, Barkeeper gesucht');
  // Luca Meier (Demo-Mitarbeiter)
  addShift(eStaff, c1, 0, '10:30', '18:00', 30, 'bestätigt', undefined, svcUnterhalt.id);
  addShift(eStaff, c1, dow, '10:00', '18:00', 30, 'geplant', 'Mittags- und Abendservice', svcFenster.id);
  addShift(eStaff, c1, (dow + 1) % 7, '10:30', '18:30', 30, 'geplant');
  addShift(eStaff, c2, (dow + 3) % 7, '16:00', '23:00', 30, 'geplant', 'Vertretung Alpen Stube');

  const absences: Absence[] = [
    {
      id: uid(),
      employeeId: e3.id,
      type: 'Urlaub',
      start: isoDate(addDays(monday, 9)),
      end: isoDate(addDays(monday, 13)),
      status: 'genehmigt',
      note: '',
    },
    {
      id: uid(),
      employeeId: e7.id,
      type: 'Krankheit',
      start: isoDate(addDays(monday, -2)),
      end: isoDate(addDays(monday, -1)),
      status: 'genehmigt',
      note: 'Attest vorliegend',
    },
    {
      id: uid(),
      employeeId: e4.id,
      type: 'Urlaub',
      start: isoDate(addDays(monday, 20)),
      end: isoDate(addDays(monday, 27)),
      status: 'beantragt',
      note: 'Sommerferien',
    },
    {
      id: uid(),
      employeeId: e6.id,
      type: 'Sonstiges',
      start: isoDate(addDays(monday, 4)),
      end: isoDate(addDays(monday, 4)),
      status: 'beantragt',
      note: 'Arzttermin',
    },
    {
      id: uid(),
      employeeId: eStaff.id,
      type: 'Urlaub',
      start: isoDate(addDays(monday, 16)),
      end: isoDate(addDays(monday, 18)),
      status: 'beantragt',
      note: 'Kurztrip',
    },
    {
      id: uid(),
      employeeId: eStaff.id,
      type: 'Unbezahlt',
      start: isoDate(addDays(monday, -10)),
      end: isoDate(addDays(monday, -10)),
      status: 'genehmigt',
      note: '',
    },
  ];

  const timeEntries: TimeEntry[] = [];
  function mkEntry(
    e: Employee,
    c: Customer,
    dayOffset: number,
    startH: number,
    startM: number,
    durMin: number,
    geofenceOk: boolean,
    dist: number,
    pauseMinutes: number,
    status: TimeEntry['status'],
    changeLog?: TimeEntry['changeLog'],
    serviceId: string | null = null
  ) {
    const day = addDays(monday, dayOffset);
    const inD = new Date(day);
    inD.setHours(startH, startM, 0, 0);
    const outD = new Date(inD.getTime() + durMin * 60000);
    const createdAt = outD.toISOString();
    const checkIn = offsetCoord(c.lat, c.lng, dist);
    const checkOut = offsetCoord(c.lat, c.lng, dist);
    timeEntries.push({
      id: uid(),
      employeeId: e.id,
      customerId: c.id,
      serviceId,
      clockIn: inD.toISOString(),
      clockOut: outD.toISOString(),
      geofenceOk,
      geofenceRadius: c.radius,
      checkInLat: checkIn.lat,
      checkInLng: checkIn.lng,
      checkInAccuracy: Math.round(8 + Math.random() * 12),
      checkInDistance: dist,
      checkOutLat: checkOut.lat,
      checkOutLng: checkOut.lng,
      checkOutAccuracy: Math.round(8 + Math.random() * 12),
      checkOutDistance: dist,
      pauseMinutes: pauseMinutes || 0,
      pauseStart: null,
      status: status || 'offen',
      notes: '',
      createdAt,
      updatedAt: changeLog && changeLog.length ? changeLog[changeLog.length - 1].ts : createdAt,
      changeLog: changeLog || [],
    });
  }
  mkEntry(e1, c1, -1, 6, 32, 478, true, 15, 30, 'bestätigt', undefined, svcUnterhalt.id);
  mkEntry(e2, c1, -1, 10, 28, 452, true, 22, 30, 'offen', undefined, svcFenster.id);
  mkEntry(e7, c3, -1, 8, 3, 478, true, 18, 30, 'bestätigt');
  mkEntry(e5, c2, -2, 11, 2, 478, true, 30, 30, 'offen', undefined, svcRasen.id);
  mkEntry(e4, c2, -2, 11, 4, 470, false, 260, 30, 'korrigiert', [
    {
      ts: `${isoDate(addDays(monday, -2))}T18:10:00`,
      text: 'Startzeit wurde von 11:15 auf 11:04 geändert.',
      by: 'Marco Baumann',
    },
    {
      ts: `${isoDate(addDays(monday, -2))}T18:11:00`,
      text: 'Notiz ergänzt: "Verspätung wegen ÖV-Ausfall, mit Mitarbeiterin abgeklärt."',
      by: 'Marco Baumann',
    },
  ]);
  mkEntry(e1, c4, -2, 9, 5, 478, true, 40, 60, 'bestätigt');
  mkEntry(eStaff, c1, -1, 10, 32, 450, true, 12, 30, 'offen');
  mkEntry(eStaff, c1, -3, 10, 28, 470, true, 18, 30, 'bestätigt');
  const inNow = new Date();
  inNow.setHours(Math.max(0, inNow.getHours() - 1), 10, 0, 0);
  const nowCheckIn = offsetCoord(c1.lat, c1.lng, 14);
  timeEntries.push({
    id: uid(),
    employeeId: e2.id,
    customerId: c1.id,
    serviceId: null,
    clockIn: inNow.toISOString(),
    clockOut: null,
    geofenceOk: true,
    geofenceRadius: c1.radius,
    checkInLat: nowCheckIn.lat,
    checkInLng: nowCheckIn.lng,
    checkInAccuracy: 12,
    checkInDistance: 14,
    checkOutLat: null,
    checkOutLng: null,
    checkOutAccuracy: null,
    checkOutDistance: null,
    pauseMinutes: 0,
    pauseStart: null,
    status: 'offen',
    notes: '',
    createdAt: inNow.toISOString(),
    updatedAt: inNow.toISOString(),
    changeLog: [],
  });

  function mkTicket(o: {
    type: Ticket['type'];
    title: string;
    description: string;
    customerId: string | null;
    assignedEmployeeId: string | null;
    assignedManagerId: string | null;
    priority: Ticket['priority'];
    status: Ticket['status'];
    dueOffset: number | null;
    category: Ticket['category'] | null;
    createdBy: string;
    num: number;
  }): Ticket {
    const createdAt = isoDate(addDays(today, -3 - o.num));
    return {
      id: uid(),
      ticketNumber: `T-${String(o.num).padStart(4, '0')}`,
      type: o.type,
      title: o.title,
      description: o.description,
      customerId: o.customerId,
      locationId: o.customerId,
      assignedEmployeeId: o.assignedEmployeeId,
      assignedManagerId: o.assignedManagerId,
      priority: o.priority,
      status: o.status,
      startDate: `${createdAt}T00:00:00`.slice(0, 10),
      dueDate: o.dueOffset === null ? null : isoDate(addDays(today, o.dueOffset)),
      dueTime: null,
      category: o.category,
      note: '',
      materialRequestId: null,
      comments: [],
      attachments: [],
      activityLog: [{ id: uid(), ts: `${createdAt}T09:00:00`, text: 'Ticket erstellt', by: o.createdBy }],
      createdBy: o.createdBy,
      createdAt: `${createdAt}T09:00:00`,
      updatedAt: `${createdAt}T09:00:00`,
    };
  }

  const tickets: Ticket[] = [
    mkTicket({
      type: 'aufgabe',
      title: 'Fensterreinigung Eingangsbereich nachbessern',
      description: 'Kunde bemängelt Schlieren an den Eingangsfenstern nach der letzten Reinigung.',
      customerId: c1.id,
      assignedEmployeeId: e2.id,
      assignedManagerId: eManager.id,
      priority: 'hoch',
      status: 'in_bearbeitung',
      dueOffset: 1,
      category: 'Reinigung nachbessern',
      createdBy: eManager.name,
      num: 1,
    }),
    mkTicket({
      type: 'aufgabe',
      title: 'Qualitätskontrolle Küche',
      description: 'Monatliche Qualitätskontrolle gemäss Vertrag durchführen und Protokoll erfassen.',
      customerId: c2.id,
      assignedEmployeeId: e4.id,
      assignedManagerId: eManager.id,
      priority: 'normal',
      status: 'geplant',
      dueOffset: 3,
      category: 'Qualitätskontrolle',
      createdBy: eManager.name,
      num: 2,
    }),
    mkTicket({
      type: 'aufgabe',
      title: 'Wasserschaden Lagerraum melden',
      description: 'Kunde meldet Feuchtigkeit im Lagerraum, bitte umgehend prüfen und Rückmeldung geben.',
      customerId: c3.id,
      assignedEmployeeId: null,
      assignedManagerId: eManager.id,
      priority: 'dringend',
      status: 'neu',
      dueOffset: 0,
      category: 'Reparatur / Schaden',
      createdBy: eAdmin.name,
      num: 3,
    }),
    mkTicket({
      type: 'aufgabe',
      title: 'Sonderreinigung nach Anlass',
      description: 'Grossanlass am Wochenende, Sonderreinigung im Anschluss einplanen.',
      customerId: c1.id,
      assignedEmployeeId: e8.id,
      assignedManagerId: eManager.id,
      priority: 'normal',
      status: 'abgeschlossen',
      dueOffset: -5,
      category: 'Sonderreinigung',
      createdBy: eManager.name,
      num: 4,
    }),
  ];

  function mkMaterial(name: string): Material {
    return { id: uid(), name, active: true };
  }
  const materials: Material[] = [
    mkMaterial('WC-Papier'),
    mkMaterial('Sanitärreiniger'),
    mkMaterial('Glasreiniger'),
    mkMaterial('Müllsäcke'),
    mkMaterial('Handschuhe'),
    mkMaterial('Mikrofasertücher'),
    mkMaterial('Mop'),
    mkMaterial('Seife'),
  ];
  const [matWcPapier, , , , matHandschuhe, matMikrofaser] = materials;

  const matReq1Id = uid();
  const materialRequests: MaterialRequest[] = [
    {
      id: matReq1Id,
      employeeId: eStaff.id,
      createdByEmployeeId: eStaff.id,
      assigneeId: null,
      locationId: c1.id,
      items: [
        { id: uid(), materialId: matMikrofaser.id, quantity: 20 },
        { id: uid(), materialId: matWcPapier.id, quantity: 4 },
      ],
      photos: [],
      status: 'eingereicht',
      completedAt: null,
      completedBy: null,
      linkedTicketId: null,
      createdAt: isoDate(addDays(today, -1)) + 'T08:30:00',
      updatedAt: isoDate(addDays(today, -1)) + 'T08:30:00',
    },
    {
      id: uid(),
      employeeId: e2.id,
      createdByEmployeeId: e2.id,
      assigneeId: eManager.id,
      locationId: c1.id,
      items: [
        { id: uid(), materialId: matHandschuhe.id, quantity: 5 },
        { id: uid(), customMaterialName: 'Batterien für Dosiergerät', quantity: 2 },
      ],
      photos: [],
      status: 'in_bearbeitung',
      completedAt: null,
      completedBy: null,
      linkedTicketId: null,
      createdAt: isoDate(addDays(today, -2)) + 'T07:15:00',
      updatedAt: isoDate(addDays(today, -1)) + 'T10:00:00',
    },
  ];

  const urgentTicket = tickets[2];
  const notifications: AppData['notifications'] = [
    {
      id: uid(),
      type: 'material_new',
      title: 'Neue Materialanfrage von ' + eStaff.name,
      message: `${eStaff.name} · ${c1.name} · 20× Mikrofasertücher, 4× WC-Papier`,
      targetRole: 'admin_manager',
      targetUserId: null,
      linkedMaterialRequestId: matReq1Id,
      linkedTicketId: null,
      read: false,
      createdAt: isoDate(addDays(today, -1)) + 'T08:30:00',
    },
    {
      id: uid(),
      type: 'ticket_urgent',
      title: 'Dringendes Ticket erstellt',
      message: `${urgentTicket.ticketNumber} · ${urgentTicket.title}`,
      targetRole: 'admin_manager',
      targetUserId: null,
      linkedMaterialRequestId: null,
      linkedTicketId: urgentTicket.id,
      read: false,
      createdAt: urgentTicket.createdAt,
    },
  ];

  return {
    employees,
    customers,
    services,
    shifts,
    absences,
    timeEntries,
    timeCorrections: [],
    customFieldDefs: [],
    chats: [],
    messages: [],
    tickets,
    materialRequests,
    materials,
    notifications,
    settings: {
      companyName: 'Alpen Gastro AG',
      weeklyHours: 42,
      defaultRadius: 100,
      rounding: 5,
      notifyLate: true,
      notifyGeofence: true,
      address: 'Seepromenade 4, 6003 Luzern',
      profileEditableFields: { ...DEFAULT_PROFILE_EDITABLE },
    },
    permissions: JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS)),
  };
}
