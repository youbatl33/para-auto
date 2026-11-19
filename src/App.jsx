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
    padding: "11px 17px",
    background: "#1675c1",
    color: "white",
    border: 0,
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: "bold",
    margin: 3
  },
  secondary: {
    padding: "10px 15px",
    background: "#e2e8f0",
    color: "#172033",
    border: 0,
    borderRadius: 8,
    cursor: "pointer",
    margin: 3
  },
  danger: {
    padding: "9px 13px",
    background: "#dc2626",
    color: "white",
    border: 0,
    borderRadius: 8,
    cursor: "pointer",
    margin: 3
  }
};

// تحميل جميع الصفوف على دفعات، دون الاقتصار على أول 1000 صف
async function getAllRows(table) {
  const all = [];
  const batchSize = 1000;
  let start = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(start, start + batchSize - 1);

    if (error) throw error;

    all.push(...(data || []));

    if (!data || data.length < batchSize) break;

    start += batchSize;
  }

  return all;
}

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

  const [newDriver, setNewDriver] = useState("");
  const [newPlate, setNewPlate] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [returnKm, setReturnKm] = useState({});

  const isAdmin = profile?.role === "admin";

  const activeDrivers = drivers.filter(d => d.active !== false);
  const activeVehicles = vehicles.filter(v => v.active !== false);

  const openTrips = trips.filter(
    t => t.status === "out" && t.return_at == null
  );

  const completedTrips = trips.filter(
    t => t.status === "returned" && t.return_at != null
  );

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;

      if (error) setMessage(error.message);

      const currentUser = data.session?.user || null;
      setUser(currentUser);

      if (!currentUser) setLoading(false);
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
        return;
      }

      setProfile(p);

      const [d, v, t] = await Promise.all([
        getAllRows("drivers"),
        getAllRows("vehicles"),
        getAllRows("trips")
      ]);

      setDrivers(d);
      setVehicles(v);
      setTrips(
        t.sort((a, b) =>
          new Date(b.created_at || b.departure_at) -
          new Date(a.created_at || a.departure_at)
        )
      );
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
    return d?.full_name || "غير محدد";
  }

  function vehicleName(id) {
    const v = vehicles.find(x => x.id === id);
    return v ? `${v.plate} ${v.label}` : "غير محددة";
  }

  function setFormValue(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  // إضافة سائق جديد
  async function addDriver(e) {
    e.preventDefault();

    if (!isAdmin) return setMessage("هذه العملية خاصة بالمراقب الرئيسي.");

    const name = newDriver.trim();

    if (!name) return setMessage("أدخل اسم السائق.");

    setSaving(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("drivers")
        .insert({ full_name: name, active: true });

      if (error) throw error;

      setNewDriver("");
      setMessage("تمت إضافة السائق بنجاح.");
      await loadData();
    } catch (error) {
      setMessage("فشل إضافة السائق: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  // إضافة سيارة جديدة
  async function addVehicle(e) {
    e.preventDefault();

    if (!isAdmin) return setMessage("هذه العملية خاصة بالمراقب الرئيسي.");

    const plate = newPlate.trim();
    const label = newLabel.trim();

    if (!plate || !label) {
      return setMessage("أدخل رقم التسجيل ونوع السيارة.");
    }

    setSaving(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("vehicles")
        .insert({ plate, label, active: true });

      if (error) throw error;

      setNewPlate("");
      setNewLabel("");
      setMessage("تمت إضافة السيارة بنجاح.");
      await loadData();
    } catch (error) {
      setMessage("فشل إضافة السيارة: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  // تعديل معلومات السائق
  async function editDriver(driver) {
    if (!isAdmin) return;

    const name = window.prompt("الاسم الجديد للسائق:", driver.full_name);

    if (name === null || !name.trim()) return;

    setSaving(true);

    const { error } = await supabase
      .from("drivers")
      .update({ full_name: name.trim() })
      .eq("id", driver.id);

    setSaving(false);

    if (error) {
      setMessage("تعذر تعديل السائق: " + error.message);
    } else {
      setMessage("تم تعديل السائق.");
      await loadData();
    }
  }

  // تعديل معلومات السيارة
  async function editVehicle(vehicle) {
    if (!isAdmin) return;

    const plate = window.prompt("رقم التسجيل:", vehicle.plate);
    if (plate === null || !plate.trim()) return;

    const label = window.prompt("نوع السيارة:", vehicle.label);
    if (label === null || !label.trim()) return;

    setSaving(true);

    const { error } = await supabase
      .from("vehicles")
      .update({
        plate: plate.trim(),
        label: label.trim()
      })
      .eq("id", vehicle.id);

    setSaving(false);

    if (error) {
      setMessage("تعذر تعديل السيارة: " + error.message);
    } else {
      setMessage("تم تعديل السيارة.");
      await loadData();
    }
  }

  // تعطيل سائق دون حذف سجلاته
  async function deactivateDriver(driver) {
    if (!isAdmin) return;

    const busy = openTrips.some(t => t.driver_id === driver.id);

    if (busy) {
      return setMessage("لا يمكن تعطيل سائق لديه رحلة مفتوحة.");
    }

    if (!window.confirm("هل تريد تعطيل هذا السائق؟")) return;

    setSaving(true);

    const { error } = await supabase
      .from("drivers")
      .update({ active: false })
      .eq("id", driver.id);

    setSaving(false);

    if (error) {
      setMessage("تعذر تعطيل السائق: " + error.message);
    } else {
      setMessage("تم تعطيل السائق.");
      await loadData();
    }
  }

  // تعطيل سيارة دون حذف سجلاتها
  async function deactivateVehicle(vehicle) {
    if (!isAdmin) return;

    const busy = openTrips.some(t => t.vehicle_id === vehicle.id);

    if (busy) {
      return setMessage("لا يمكن تعطيل سيارة لديها رحلة مفتوحة.");
    }

    if (!window.confirm("هل تريد تعطيل هذه السيارة؟")) return;

    setSaving(true);

    const { error } = await supabase
      .from("vehicles")
      .update({ active: false })
      .eq("id", vehicle.id);

    setSaving(false);

    if (error) {
      setMessage("تعذر تعطيل السيارة: " + error.message);
    } else {
      setMessage("تم تعطيل السيارة.");
      await loadData();
    }
  }

  // تسجيل رحلة جديدة
  async function addTrip(e) {
    e.preventDefault();

    if (
      !form.driver_id ||
      !form.vehicle_id ||
      !form.destination.trim() ||
      form.departure_km === ""
    ) {
      return setMessage("يرجى ملء جميع المعلومات الضرورية.");
    }

    const km = Number(form.departure_km);

    if (!Number.isInteger(km) || km < 0) {
      return setMessage("عداد الانطلاق يجب أن يكون رقماً صحيحاً غير سالب.");
    }

    const driver = activeDrivers.find(d => d.id === form.driver_id);
    const vehicle = activeVehicles.find(v => v.id === form.vehicle_id);

    if (!driver || !vehicle) {
      return setMessage("السائق أو السيارة غير متاح.");
    }

    const alreadyOpen = openTrips.some(
      t => t.vehicle_id === form.vehicle_id
    );

    if (alreadyOpen) {
      return setMessage("هذه السيارة لديها رحلة مفتوحة بالفعل.");
    }

    setSaving(true);
    setMessage("");

    try {
      const { error } = await supabase.from("trips").insert({
        driver_id: form.driver_id,
        vehicle_id: form.vehicle_id,
        destination: form.destination.trim(),
        purpose: form.purpose.trim() || null,
        departure_km: km,
        notes: form.notes.trim() || null,
        departure_at: new Date().toISOString(),
        return_at: null,
        return_km: null,
        status: "out",
        client_id: user.id,
        driver_name: driver.full_name,
        vehicle_name: `${vehicle.plate} ${vehicle.label}`
      });

      if (error) throw error;

      setForm({
        driver_id: "",
        vehicle_id: "",
        destination: "",
        purpose: "",
        departure_km: "",
        notes: ""
      });

      setMessage("تم تسجيل الرحلة بنجاح.");
      setTab("trips");
      await loadData();
    } catch (error) {
      setMessage("فشل تسجيل الرحلة: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  // تسجيل عودة السيارة
  async function finishTrip(trip) {
    const value = returnKm[trip.id];

    if (value === undefined || value === "") {
      return setMessage("أدخل عداد الكيلومترات عند العودة.");
    }

    const km = Number(value);

    if (!Number.isInteger(km) || km < Number(trip.departure_km)) {
      return setMessage(
        "عداد العودة يجب أن يكون رقماً صحيحاً وأكبر من أو يساوي عداد الانطلاق."
      );
    }

    if (!window.confirm("هل تريد تأكيد عودة السيارة؟")) return;

    setSaving(true);
    setMessage("");

    try {
      const { data, error } = await supabase
        .from("trips")
        .update({
          return_km: km,
          return_at: new Date().toISOString(),
          status: "returned"
        })
        .eq("id", trip.id)
        .eq("status", "out")
        .is("return_at", null)
        .select("id");

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("لم يتم تحديث الرحلة. تحقق من الصلاحيات أو حالة الرحلة.");
      }

      setReturnKm(prev => ({ ...prev, [trip.id]: "" }));
      setMessage("تم تسجيل عودة السيارة بنجاح.");
      await loadData();
    } catch (error) {
      setMessage("تعذر تسجيل العودة: " + error.message);
    } finally {
      setSaving(false);
    }
  }
