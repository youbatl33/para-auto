
import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f1f5f9",
    direction: "rtl",
    fontFamily: "Arial, sans-serif",
    color: "#172033",
    paddingBottom: 40
  },
  header: {
    background: "#102b46",
    color: "white",
    padding: "22px 18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12
  },
  container: {
    maxWidth: 1100,
    margin: "auto",
    padding: 18
  },
  card: {
    background: "white",
    borderRadius: 12,
    padding: 20,
    marginBottom: 18,
    boxShadow: "0 2px 8px #0000000c"
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: 12,
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    marginTop: 7,
    marginBottom: 14,
    fontSize: 15
  },
  button: {
    padding: "12px 20px",
    background: "#1675c1",
    color: "white",
    border: 0,
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 15,
    fontWeight: "bold"
  },
  secondary: {
    padding: "10px 16px",
    background: "#e2e8f0",
    color: "#172033",
    border: 0,
    borderRadius: 8,
    cursor: "pointer"
  }
};

function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState("trips");

  const [form, setForm] = useState({
    driver_id: "",
    vehicle_id: "",
    destination: "",
    purpose: "",
    departure_km: "",
    notes: ""
  });

  const [returnKm, setReturnKm] = useState({});

  const isAdmin = profile?.role === "admin";
  const openTrips = trips.filter(t => !t.return_at);
  const completedTrips = trips.filter(t => !!t.return_at);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setUser(data.session?.user || null);
        if (!data.session?.user) setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
        if (!session?.user) {
          setProfile(null);
          setDrivers([]);
          setVehicles([]);
          setTrips([]);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  async function loadData() {
    setLoading(true);
    setMessage("");

    try {
      const { data: p, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!p || p.active === false) {
        await supabase.auth.signOut();
        setMessage("الحساب غير مفعل أو لم يتم إنشاء الملف الشخصي.");
        setLoading(false);
        return;
      }

      setProfile(p);

      const results = await Promise.all([
        supabase.from("drivers").select("*"),
        supabase.from("vehicles").select("*").order("created_at", {
          ascending: false
        }),
        supabase.from("trips").select("*").order("created_at", {
          ascending: false
        })
      ]);

      results.forEach(result => {
        if (result.error) throw result.error;
      });

      setDrivers(results[0].data || []);
      setVehicles((results[1].data || []).filter(v => v.active !== false));
      setTrips(results[2].data || []);

    } catch (error) {
      setMessage("خطأ في تحميل البيانات: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function login(e) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) setMessage("تعذر الدخول: " + error.message);
    setSaving(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    setProfile(null);
    setUser(null);
  }

  function driverName(id) {
    const d = drivers.find(x => x.id === id);
    if (!d) return "غير محدد";

    return d.full_name || d.name || d.driver_name ||
      d.first_name || d.id;
  }

  function vehicleName(id) {
    const v = vehicles.find(x => x.id === id);
    if (!v) return "غير محددة";
    return `${v.plate || ""} ${v.label || ""}`;
  }

  async function addTrip(e) {
    e.preventDefault();

    if (!form.driver_id || !form.vehicle_id ||
        !form.destination || form.departure_km === "") {
      setMessage("يرجى ملء جميع المعلومات الضرورية.");
      return;
    }

    if (Number(form.departure_km) < 0) {
      setMessage("قيمة عداد الانطلاق غير صحيحة.");
      return;
    }

    const alreadyOpen = trips.some(
      t => t.vehicle_id === form.vehicle_id && !t.return_at
    );

    if (alreadyOpen) {
      setMessage("هذه السيارة لديها رحلة مفتوحة بالفعل!");
      return;
    }

    setSaving(true);
    setMessage("");

    const driver = drivers.find(d => d.id === form.driver_id);

    const { error } = await supabase.from("trips").insert({
      driver_id: form.driver_id,
      vehicle_id: form.vehicle_id,
      destination: form.destination,
      purpose: form.purpose || null,
      departure_km: Number(form.departure_km),
      notes: form.notes || null,
      departure_at: new Date().toISOString(),
      status: "open",
      client_id: user.id,
      driver_name: driverName(form.driver_id)
    });

    if (error) {
      setMessage("فشل تسجيل الرحلة: " + error.message);
    } else {
      setMessage("تم تسجيل الرحلة بنجاح.");
      setForm({
        driver_id: "",
        vehicle_id: "",
        destination: "",
        purpose: "",
        departure_km: "",
        notes: ""
      });
      await loadData();
    }

    setSaving(false);
  }

  async function finishTrip(trip) {
    const km = returnKm[trip.id];

    if (km === undefined || km === "") {
      setMessage("أدخل عداد الكيلومترات عند العودة.");
      return;
    }

    if (Number(km) < Number(trip.departure_km)) {
      setMessage("عداد العودة لا يمكن أن يكون أقل من عداد الانطلاق.");
      return;
    }

    if (!window.confirm("هل تريد تأكيد عودة السيارة؟")) return;

    setSaving(true);

    const { error } = await supabase
      .from("trips")
      .update({
        return_km: Number(km),
        return_at: new Date().toISOString(),
        status: "completed"
      })
      .eq("id", trip.id)
      .is("return_at", null);

    if (error) {
      setMessage("تعذر تسجيل العودة: " + error.message);
    } else {
      setMessage("تم تسجيل عودة السيارة بنجاح.");
      await loadData();
    }

    setSaving(false);
  }

  const field = (label, value, onChange, type = "text") => (
    <label style={{ display: "block", fontWeight: "bold" }}>
      {label}
      <input
        style={styles.input}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        required
      />
    </label>
  );

  if (!user) {
    return (
      <div style={styles.page}>
        <div style={{
          ...styles.card,
          maxWidth: 400,
          margin: "80px auto",
          textAlign: "center"
        }}>
          <h1>🚘 PARA AUTO</h1>
          <p>نظام تدبير وتتبع السيارات والرحلات</p>

          <form onSubmit={login}>
            {field("البريد الإلكتروني", email, setEmail, "email")}
            {field("كلمة المرور", password, setPassword, "password")}

            <button style={styles.button} disabled={saving}>
              {saving ? "جارٍ الدخول..." : "تسجيل الدخول"}
            </button>
          </form>

          {message && <p style={{ color: "red" }}>{message}</p>}
        </div>
      </div>
    );
  }

  if (loading) {
    return <div style={styles.page}><h2 style={{textAlign:"center",padding:50}}>جارٍ تحميل البيانات...</h2></div>;
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h2 style={{ margin: 0 }}>🚘 PARA AUTO</h2>
          <small>نظام تدبير السيارات والرحلات</small>
        </div>

        <div>
          {profile?.full_name || user.email}
          {" "}
          <button style={styles.secondary} onClick={logout}>
            خروج
          </button>
        </div>
      </header>

      <main style={styles.container}>
        {message && (
          <div style={{
            ...styles.card,
            color: "#155e35",
            borderRight: "4px solid #16a34a"
          }}>
            {message}
            <button
              style={{ ...styles.secondary, float: "left" }}
              onClick={() => setMessage("")}
            >
              إغلاق
            </button>
          </div>
        )}

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
          gap: 12
        }}>
          {[
            ["السيارات", vehicles.length],
            ["السائقون", drivers.length],
            ["الرحلات المفتوحة", openTrips.length],
            ["الرحلات المكتملة", completedTrips.length]
          ].map(([label, number]) => (
            <div key={label} style={styles.card}>
              <div>{label}</div>
              <h2 style={{ color: "#1675c1" }}>{number}</h2>
            </div>
          ))}
        </div>

        <div style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 18
        }}>
          {[
            ["trips", "الرحلات"],
            ["new", "تسجيل رحلة"],
            ["vehicles", "السيارات"],
            ["drivers", "السائقون"]
          ].map(([id, label]) => (
            <button
              key={id}
              style={{
                ...styles.button,
                background: tab === id ? "#102b46" : "#64748b"
              }}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "new" && (
          <section style={styles.card}>
            <h2>تسجيل رحلة جديدة</h2>

            <form onSubmit={addTrip}>
              <label>
                السائق
                <select
                  style={styles.input}
                  value={form.driver_id}
                  onChange={e => setForm({
                    ...form,
                    driver_id: e.target.value
                  })}
                  required
                >
                  <option value="">اختر السائق</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {driverName(d.id)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                السيارة
                <select
                  style={styles.input}
                  value={form.vehicle_id}
                  onChange={e => setForm({
                    ...form,
                    vehicle_id: e.target.value
                  })}
                  required
                >
                  <option value="">اختر السيارة</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {vehicleName(v.id)}
                    </option>
                  ))}
                </select>
              </label>

              {field("الوجهة", form.destination, v =>
                setForm({ ...form, destination: v })
              )}

              {field("الغرض من الرحلة", form.purpose, v =>
                setForm({ ...form, purpose: v })
              )}

              {field("عداد الكيلومترات عند الانطلاق", form.departure_km, v =>
                setForm({ ...form, departure_km: v })
              , "number")}

              <label>
                ملاحظات
                <textarea
                  style={styles.input}
                  value={form.notes}
                  onChange={e => setForm({
                    ...form,
                    notes: e.target.value
                  })}
                />
              </label>

              <button style={styles.button} disabled={saving}>
                {saving ? "جارٍ التسجيل..." : "تأكيد تسجيل الرحلة"}
              </button>
            </form>
          </section>
        )}

        {tab === "trips" && (
          <>
            <section style={styles.card}>
              <h2>الرحلات المفتوحة</h2>

              {openTrips.length === 0 && <p>لا توجد رحلات مفتوحة حاليا.</p>}

              {openTrips.map(t => (
                <div key={t.id} style={{
                  border: "1px solid #dbe3ec",
                  padding: 15,
                  borderRadius: 9,
                  marginBottom: 12
                }}>
                  <h3>{t.destination}</h3>
                  <p>السائق: {t.driver_name || driverName(t.driver_id)}</p>
                  <p>السيارة: {vehicleName(t.vehicle_id)}</p>
                  <p>الغرض: {t.purpose || "غير محدد"}</p>
                  <p>عداد الانطلاق: {t.departure_km} كم</p>
                  <p>
                    تاريخ الانطلاق:
                    {" "}
                    {t.departure_at
                      ? new Date(t.departure_at).toLocaleString("ar-MA")
                      : "غير محدد"}
                  </p>

                  <label>
                    عداد الكيلومترات عند العودة
                    <input
                      style={styles.input}
                      type="number"
                      value={returnKm[t.id] || ""}
                      onChange={e => setReturnKm({
                        ...returnKm,
                        [t.id]: e.target.value
                      })}
                    />
                  </label>

                  <button
                    style={{ ...styles.button, background: "#16834b" }}
                    disabled={saving}
                    onClick={() => finishTrip(t)}
                  >
                    تسجيل العودة
                  </button>
                </div>
              ))}
            </section>

            <section style={styles.card}>
              <h2>سجل الرحلات المكتملة</h2>
              {completedTrips.length === 0 && <p>لا توجد رحلات مكتملة.</p>}

              {completedTrips.map(t => (
                <div key={t.id} style={{
                  borderBottom: "1px solid #ddd",
                  padding: 12
                }}>
                  <strong>{t.destination}</strong>
                  <p>السائق: {t.driver_name || driverName(t.driver_id)}</p>
                  <p>السيارة: {vehicleName(t.vehicle_id)}</p>
                  <p>
                    المسافة المقطوعة:
                    {" "}
                    {Number(t.return_km) - Number(t.departure_km)} كم
                  </p>
                  <p>
                    الانطلاق: {t.departure_km} كم
                    {" | "}
                    العودة: {t.return_km} كم
                  </p>
                </div>
              ))}
            </section>
          </>
        )}

        {tab === "vehicles" && (
          <section style={styles.card}>
            <h2>قائمة السيارات</h2>
            {vehicles.map(v => (
              <div key={v.id} style={{
                padding: 12,
                borderBottom: "1px solid #ddd"
              }}>
                <strong>{v.plate}</strong>
                {" — "}
                {v.label}
                <p>
                  الحالة:
                  {" "}
                  {openTrips.some(t => t.vehicle_id === v.id)
                    ? "في رحلة"
                    : "متاحة"}
                </p>
              </div>
            ))}
          </section>
        )}

        {tab === "drivers" && (
          <section style={styles.card}>
            <h2>قائمة السائقين</h2>
            {drivers.map(d => (
              <div key={d.id} style={{
                padding: 12,
                borderBottom: "1px solid #ddd"
              }}>
                {driverName(d.id)}
              </div>
            ))}
          </section>
        )}

        <div style={{ textAlign: "center", padding: 20 }}>
          <button style={styles.secondary} onClick={loadData}>
            تحديث البيانات ↻
          </button>
          <p style={{ color: "#64748b" }}>PARA AUTO © 2026</p>
        </div>
      </main>
    </div>
  );
}

export default App;
