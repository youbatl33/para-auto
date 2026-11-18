import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ogmxkpzznvgvqkajyuse.supabase.co',
  'sb_publishable_e4wuJmyvETcYnmhzYS0Xkw_XWWn067Y'
);

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [trips, setTrips] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [destination, setDestination] = useState('');
  const [purpose, setPurpose] = useState('');
  const [driverId, setDriverId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [km, setKm] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadData();
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session) loadData();
        else setProfile(null);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadData() {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const [p, d, v, t] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('drivers').select('*').eq('active', true),
      supabase.from('vehicles').select('*').eq('active', true),
      supabase.from('trips').select('*').order('departure_at', { ascending: false })
    ]);

    setProfile(p.data);
    setDrivers(d.data || []);
    setVehicles(v.data || []);
    setTrips(t.data || []);
  }

  async function login(e) {
    e.preventDefault();
    setMessage('');
    const { error } = await supabase.auth.signInWithPassword({
      email, password
    });
    if (error) setMessage(error.message);
  }

  async function logout() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  async function startTrip(e) {
    e.preventDefault();
    setMessage('');

    if (!driverId || !vehicleId || !destination || !km) {
      setMessage('يرجى ملء جميع المعلومات الضرورية');
      return;
    }

    const { error } = await supabase.from('trips').insert({
      driver_id: driverId,
      vehicle_id: vehicleId,
      destination,
      purpose,
      departure_km: Number(km),
      status: 'open'
    });

    if (error) setMessage(error.message);
    else {
      setMessage('تم تسجيل الانطلاق بنجاح');
      setDestination('');
      setPurpose('');
      setKm('');
      loadData();
    }
  }

  async function finishTrip(trip) {
    const returnKm = prompt('أدخل عداد الكيلومترات عند الرجوع');
    if (!returnKm || Number(returnKm) < Number(trip.departure_km)) {
      setMessage('قيمة الكيلومترات غير صحيحة');
      return;
    }

    const { error } = await supabase.from('trips').update({
      return_at: new Date().toISOString(),
      return_km: Number(returnKm),
      status: 'closed'
    }).eq('id', trip.id).is('return_at', null);

    setMessage(error ? error.message : 'تم تسجيل الرجوع بنجاح');
    loadData();
  }

  if (!session) {
    return (
      <main className="login">
        <h1>PARA AUTO</h1>
        <p>نظام تدبير السيارات والرحلات</p>
        <form onSubmit={login}>
          <input type="email" placeholder="البريد الإلكتروني"
            value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="كلمة المرور"
            value={password} onChange={e => setPassword(e.target.value)} required />
          <button>دخول</button>
        </form>
        <p>{message}</p>
      </main>
    );
  }

  const isAdmin = profile?.role === 'admin';

  return (
    <main className="app">
      <header>
        <div>
          <h1>PARA AUTO</h1>
          <p>{profile?.full_name || session.user.email}</p>
        </div>
        <button onClick={logout}>خروج</button>
      </header>

      <h2>{isAdmin ? 'لوحة المراقب الرئيسي' : 'فضاء السائق'}</h2>
      <p className="notice">{message}</p>

      {!isAdmin && (
        <section className="panel">
          <h3>تسجيل انطلاق رحلة</h3>
          <form onSubmit={startTrip}>
            <label>السائق</label>
            <select value={driverId} onChange={e => setDriverId(e.target.value)} required>
              <option value="">اختر السائق</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
            </select>

            <label>السيارة</label>
            <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} required>
              <option value="">اختر السيارة</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.label} - {v.plate}</option>)}
            </select>

            <label>الوجهة</label>
            <input value={destination} onChange={e => setDestination(e.target.value)} required />

            <label>سبب التنقل</label>
            <input value={purpose} onChange={e => setPurpose(e.target.value)} />

            <label>عداد الكيلومترات عند الانطلاق</label>
            <input type="number" min="0" value={km}
              onChange={e => setKm(e.target.value)} required />

            <button>تسجيل الانطلاق</button>
          </form>
        </section>
      )}

      <section className="panel">
        <h3>{isAdmin ? 'جميع الرحلات' : 'رحلاتي'}</h3>
        {trips
          .filter(t => isAdmin || t.driver_id === profile?.id)
          .map(t => (
            <article className="trip" key={t.id}>
              <b>{t.destination}</b>
              <p>الحالة: {t.return_at ? 'مغلقة' : 'مفتوحة'}</p>
              <p>عداد الانطلاق: {t.departure_km}</p>
              {t.return_at ? (
                <p>عداد الرجوع: {t.return_km}</p>
              ) : (
                <button onClick={() => finishTrip(t)}>تسجيل الرجوع</button>
              )}
            </article>
          ))}
      </section>

      {isAdmin && (
        <>
          <section className="panel">
            <h3>السائقون</h3>
            {drivers.map(d => <p key={d.id}>{d.full_name}</p>)}
          </section>
          <section className="panel">
            <h3>السيارات</h3>
            {vehicles.map(v => <p key={v.id}>{v.label} - {v.plate}</p>)}
          </section>
        </>
      )}
    </main>
  );
}
