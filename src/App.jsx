
import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import "./App.css";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const [destination, setDestination] = useState("");
  const [purpose, setPurpose] = useState("");
  const [driverId, setDriverId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [departureKm, setDepartureKm] = useState("");
  const [notes, setNotes] = useState("");
  const [returnKm, setReturnKm] = useState({});

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSession(data.session);
        loadProfile(data.session.user);
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);
        if (currentSession) {
          loadProfile(currentSession.user);
        } else {
          setProfile(null);
          setTrips([]);
          setLoading(false);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadProfile(user) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      setMessage("خطأ في الحساب: " + error.message);
      setLoading(false);
      return;
    }

    setProfile(data);
    await loadData();
    setLoading(false);
  }

  async function loadData() {
    const [d, v, t] = await Promise.all([
      supabase.from("drivers").select("*"),
      supabase.from("vehicles").select("*"),
      supabase.from("trips").select("*").order("created_at", {
        ascending: false
      })
    ]);

    if (d.error || v.error || t.error) {
      setMessage(
        "خطأ في تحميل البيانات: " +
        (d.error?.message || v.error?.message || t.error?.message)
      );
      return;
    }

    setDrivers(d.data || []);
    setVehicles(v.data || []);
    setTrips(t.data || []);
  }

  async function login(e) {
    e.preventDefault();
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) setMessage(error.message);
  }

  async function logout() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }

  async function createTrip(e) {
    e.preventDefault();
    if (busy) return;

    setBusy(true);
    setMessage("");

    try {
      if (!session || !profile) {
        throw new Error("يجب تسجيل الدخول أولا");
      }

      const selectedDriver = drivers.find(d => d.id === driverId);
      const selectedVehicle = vehicles.find(v => v.id === vehicleId);

      if (!selectedDriver || !selectedVehicle) {
        throw new Error("اختيار السائق والسيارة ضروري");
      }

      const km = Number(departureKm);

      if (!Number.isInteger(km) || km < 0) {
        throw new Error("عداد الانطلاق غير صحيح");
      }

      const vehicleBusy = trips.some(
        t => t.vehicle_id === vehicleId && t.status === "out"
      );

      if (vehicleBusy) {
        throw new Error("السيارة لديها رحلة لم يتم تسجيل رجوعها");
      }

      const driverBusy = trips.some(
        t => t.driver_id === driverId && t.status === "out"
      );

      if (driverBusy) {
        throw new Error("السائق لديه رحلة لم يتم تسجيل رجوعها");
      }

      const now = new Date().toISOString();

      const newTrip = {
        driver_id: driverId,
        vehicle_id: vehicleId,
        driver_name: selectedDriver.full_name || "",
        vehicle_name:
          selectedVehicle.plate ||
          selectedVehicle.registration ||
          selectedVehicle.label ||
          "",
        destination: destination.trim(),
        purpose: purpose || null,
        departure_at: now,
        departure_km: km,
        notes: notes || null,
        status: "out",
        client_id: session.user.id
      };

      const { data, error } = await supabase
        .from("trips")
        .insert([newTrip])
        .select();

      if (error) throw error;

      setTrips(old => [...(data || []), ...old]);
      setDestination("");
      setPurpose("");
      setDriverId("");
      setVehicleId("");
      setDepartureKm("");
      setNotes("");

      setMessage(
        "تم تسجيل الانطلاق بنجاح بتاريخ " +
        new Date(now).toLocaleString("fr-FR")
      );

      await loadData();
    } catch (error) {
      setMessage("لم يتم تسجيل الرحلة: " + error.message);
    } finally {
      setBusy(false);
    }
  }

  async function finishTrip(trip) {
    if (busy) return;

    const km = Number(returnKm[trip.id]);

    if (!Number.isInteger(km) || km < trip.departure_km) {
      setMessage("عداد الرجوع يجب أن يكون أكبر أو مساويا لعداد الانطلاق");
      return;
    }

    setBusy(true);

    try {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("trips")
        .update({
          return_at: now,
          return_km: km,
          status: "returned"
        })
        .eq("id", trip.id)
        .eq("status", "out")
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("لم يتم تحديث الرحلة، تحقق من صلاحيات الحساب");
      }

      setReturnKm(old => ({ ...old, [trip.id]: "" }));
      setMessage("تم تسجيل الرجوع بنجاح");
      await loadData();
    } catch (error) {
      setMessage("خطأ في تسجيل الرجوع: " + error.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="loading">جاري تحميل PARA AUTO...</div>;
  }

  if (!session) {
    return (
      <main className="login-page" dir="rtl">
        <form className="login-card" onSubmit={login}>
          <h1>PARA AUTO</h1>
          <p>نظام تدبير وتتبع السيارات والرحلات</p>

          <input
            type="email"
            placeholder="البريد الإلكتروني"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="كلمة المرور"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          <button type="submit">تسجيل الدخول</button>
          {message && <p className="message">{message}</p>}
        </form>
      </main>
    );
  }

  const openTrips = trips.filter(t => t.status === "out");
  const completedTrips = trips.filter(t => t.status === "returned");

  return (
    <main className="app" dir="rtl">
      <header className="header">
        <div>
          <h1>PARA AUTO</h1>
          <p>نظام تدبير أسطول السيارات</p>
        </div>

        <div className="user-info">
          <span>{profile?.full_name}</span>
          <span>{isAdmin ? "المراقب الرئيسي" : profile?.role}</span>
          <button className="logout" onClick={logout}>خروج</button>
        </div>
      </header>

      {message && (
        <div className="message">
          {message}
          <button onClick={() => setMessage("")}>×</button>
        </div>
      )}

      <section className="stats">
        <div className="stat">
          <span>السيارات</span>
          <strong>{vehicles.length}</strong>
        </div>
        <div className="stat">
          <span>السائقون</span>
          <strong>{drivers.length}</strong>
        </div>
        <div className="stat">
          <span>الرحلات الجارية</span>
          <strong>{openTrips.length}</strong>
        </div>
        <div className="stat">
          <span>الرحلات المكتملة</span>
          <strong>{completedTrips.length}</strong>
        </div>
      </section>

      <section className="panel">
        <h2>تسجيل رحلة جديدة</h2>

        <form className="trip-form" onSubmit={createTrip}>
          <label>السائق</label>
          <select value={driverId} onChange={e => setDriverId(e.target.value)} required>
            <option value="">اختر السائق</option>
            {drivers.map(d => (
              <option key={d.id} value={d.id}>
                {d.full_name}
              </option>
            ))}
          </select>

          <label>السيارة</label>
          <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} required>
            <option value="">اختر السيارة</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>
                {v.plate || v.registration || v.label || v.id}
              </option>
            ))}
          </select>

          <label>الوجهة</label>
          <input value={destination} onChange={e => setDestination(e.target.value)} required />

          <label>الغرض من الرحلة</label>
          <input value={purpose} onChange={e => setPurpose(e.target.value)} />

          <label>عداد الانطلاق (KM)</label>
          <input
            type="number"
            min="0"
            step="1"
            value={departureKm}
            onChange={e => setDepartureKm(e.target.value)}
            required
          />

          <label>ملاحظات</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} />

          <button type="submit" disabled={busy}>
            {busy ? "جاري التسجيل..." : "تسجيل الانطلاق"}
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>الرحلات الجارية</h2>

        {openTrips.length === 0 && <p>لا توجد رحلات جارية</p>}

        {openTrips.map(trip => (
          <article className="trip-card" key={trip.id}>
            <h3>{trip.destination}</h3>
            <p>السائق: {trip.driver_name || "—"}</p>
            <p>السيارة: {trip.vehicle_name || "—"}</p>
            <p>تاريخ الانطلاق: {new Date(trip.departure_at).toLocaleString("fr-FR")}</p>
            <p>عداد الانطلاق: {trip.departure_km} KM</p>

            <label>عداد الرجوع</label>
            <input
              type="number"
              min={trip.departure_km}
              step="1"
              value={returnKm[trip.id] || ""}
              onChange={e =>
                setReturnKm(old => ({ ...old, [trip.id]: e.target.value }))
              }
            />

            <button disabled={busy} onClick={() => finishTrip(trip)}>
              تسجيل الرجوع
            </button>
          </article>
        ))}
      </section>

      <section className="panel">
        <h2>سجل جميع الرحلات</h2>

        {trips.length === 0 && <p>لا توجد رحلات مسجلة</p>}

        {trips.map(trip => (
          <article className="history-card" key={trip.id}>
            <h3>{trip.destination}</h3>
            <p>السائق: {trip.driver_name || "—"}</p>
            <p>السيارة: {trip.vehicle_name || "—"}</p>
            <p>
              الانطلاق: {trip.departure_at
                ? new Date(trip.departure_at).toLocaleString("fr-FR")
                : "—"}
            </p>
            <p>عداد الانطلاق: {trip.departure_km} KM</p>
            <p>
              الرجوع: {trip.return_at
                ? new Date(trip.return_at).toLocaleString("fr-FR")
                : "لم يسجل بعد"}
            </p>
            <p>عداد الرجوع: {trip.return_km ?? "—"}</p>
            <span className={trip.status === "returned" ? "done" : "pending"}>
              {trip.status === "returned" ? "مكتملة" : "في مهمة"}
            </span>
          </article>
        ))}
      </section>

      <footer>PARA AUTO © 2026</footer>
    </main>
  );
}
