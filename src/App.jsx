import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const APP_NAME = "GGR PARC AUTO";
const APP_SUBTITLE = "GROUPE D'INTERVENTION";
const FUEL_LEVELS = ["Réserve", "1/4", "1/2", "3/4", "Plein"];

const css = {
  page: { minHeight: "100vh", background: "#f4f7fb", direction: "ltr", fontFamily: "Arial,sans-serif", color: "#172033" },
  header: { background: "#fff", color: "#111827", padding: 18, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, borderBottom: "3px solid #1769ff", boxShadow: "0 3px 15px #00000012" },
  container: { maxWidth: 1150, margin: "auto", padding: 16 },
  card: { background: "#fff", border: "1px solid #e1e7f0", borderRadius: 12, padding: 18, marginBottom: 18, boxShadow: "0 3px 12px #0000000a", color: "#172033" },
  input: { width: "100%", boxSizing: "border-box", padding: 12, background: "#fff", color: "#172033", border: "1px solid #cbd5e1", borderRadius: 8, marginTop: 7, marginBottom: 14, outlineColor: "#1769ff" },
  button: { padding: "11px 16px", background: "linear-gradient(135deg,#1769ff,#0645b5)", color: "#fff", border: "1px solid #1769ff", borderRadius: 8, cursor: "pointer", margin: 3, fontWeight: "bold" },
  secondary: { padding: "10px 14px", background: "#edf3ff", color: "#123b80", border: "1px solid #c6d8fa", borderRadius: 8, cursor: "pointer", margin: 3 },
  danger: { padding: "9px 13px", background: "#dc2626", color: "#fff", border: "1px solid #ef4444", borderRadius: 8, cursor: "pointer", margin: 3 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }
};

function GigrLogo({ compact = false }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 12, direction: "ltr" }}>
    <svg viewBox="0 0 120 130" width={compact ? 58 : 82} height={compact ? 64 : 90}>
      <defs>
        <linearGradient id="ggrShield" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#26364d"/><stop offset="100%" stopColor="#080e1b"/></linearGradient>
        <linearGradient id="ggrCar" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#4095ff"/><stop offset="100%" stopColor="#0750c5"/></linearGradient>
      </defs>
      <path d="M60 5 L108 23 L101 78 Q91 108 60 125 Q29 108 19 78 L12 23 Z" fill="url(#ggrShield)" stroke="#1769ff" strokeWidth="4"/>
      <path d="M60 13 L98 28 L92 75 Q84 98 60 112 Q36 98 28 75 L22 28 Z" fill="none" stroke="#75b2ff" strokeWidth="1.5"/>
      <path d="M38 29 H82" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
      <path d="M25 73 L33 53 Q36 46 45 46 H75 Q84 46 87 53 L95 73 L99 80 V88 H21 V80 Z" fill="url(#ggrCar)" stroke="#fff" strokeWidth="2"/>
      <path d="M39 54 Q41 51 47 51 H73 Q79 51 81 54 L87 68 H33 Z" fill="#e8f2ff" stroke="#a8ceff" strokeWidth="1.5"/>
      <path d="M60 52 V68" stroke="#1769ff" strokeWidth="2"/>
      <circle cx="39" cy="86" r="7" fill="#080e1b" stroke="#fff" strokeWidth="2"/><circle cx="81" cy="86" r="7" fill="#080e1b" stroke="#fff" strokeWidth="2"/>
      <text x="60" y="105" textAnchor="middle" fontSize="13" fontWeight="900" fill="#fff" letterSpacing="2">GGR</text>
    </svg>
    {!compact && <div style={{ textAlign: "left", lineHeight: 1.2 }}>
      <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: 3, color: "#101827" }}>GGR</div>
      <div style={{ fontSize: 12, color: "#1769ff", letterSpacing: 1, fontWeight: 900 }}>{APP_SUBTITLE}</div>
      <div style={{ fontSize: 17, color: "#101827", letterSpacing: 3, fontWeight: 900, marginTop: 3 }}>PARC AUTO</div>
    </div>}
  </div>;
}

async function getAllRows(table) {
  let all = [], start = 0;
  while (true) {
    const { data, error } = await supabase.from(table).select("*").range(start, start + 999);
    if (error) throw error;
    all.push(...(data || []));
    if (!data || data.length < 1000) break;
    start += 1000;
  }
  return all;
}

const emptyForm = {
  driver_name: "", driver_matricule: "", vehicle_name: "", destination: "",
  purpose: "", departure_km: "", departure_fuel_level: "Plein", notes: ""
};

function generateReturnCode() {
  const bytes = new Uint8Array(8);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}
function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
}
function today() { return new Date().toISOString().slice(0, 10); }

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState("trips");
  const [form, setForm] = useState(emptyForm);
  const [newDriverFirst, setNewDriverFirst] = useState("");
  const [newDriverLast, setNewDriverLast] = useState("");
  const [newDriverMatricule, setNewDriverMatricule] = useState("");
  const [newPlate, setNewPlate] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [returnKm, setReturnKm] = useState({});
  const [returnFuel, setReturnFuel] = useState({});
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatus, setHistoryStatus] = useState("all");
  const [newTripCode, setNewTripCode] = useState("");
  const [returnCodeInput, setReturnCodeInput] = useState("");
  const [returnKmInput, setReturnKmInput] = useState("");
  const [returnFuelInput, setReturnFuelInput] = useState("Plein");
  const [maintenanceVehicle, setMaintenanceVehicle] = useState("");
  const [maintenanceDate, setMaintenanceDate] = useState(today());
  const [maintenanceKm, setMaintenanceKm] = useState("");
  const [maintenanceInterval, setMaintenanceInterval] = useState("10000");
  const [maintenanceNotes, setMaintenanceNotes] = useState("");
  const [currentKm, setCurrentKm] = useState({});

  const isAdmin = profile?.role === "admin" && profile?.active !== false;
  const openTrips = trips.filter(t => t.status === "out" && t.return_at == null);
  const completedTrips = trips.filter(t => t.status === "returned" && t.return_at != null);

  function setFormValue(key, value) { setForm(prev => ({ ...prev, [key]: value })); }
  function driverName(id) { return drivers.find(d => String(d.id) === String(id))?.full_name || "Non renseigné"; }
  function driverMatricule(id) { return drivers.find(d => String(d.id) === String(id))?.matricule || "Non renseigné"; }
  function vehicleName(id) { const v = vehicles.find(x => String(x.id) === String(id)); return v ? `${v.plate} ${v.label}` : "Non renseigné"; }

  const filteredTrips = trips.filter(t => {
    const s = historySearch.trim().toLowerCase();
    const vals = [t.destination, t.driver_name || driverName(t.driver_id), t.driver_matricule || driverMatricule(t.driver_id), t.vehicle_name || vehicleName(t.vehicle_id), t.purpose, t.notes];
    return vals.some(v => String(v || "").toLowerCase().includes(s)) && (historyStatus === "all" || t.status === historyStatus);
  });

  useEffect(() => {
    let mounted = true;
    async function checkSession() {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;
      if (error) setMessage(error.message);
      const current = data.session?.user || null;
      setUser(current);
      if (!current) setLoading(false);
    }
    checkSession();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (!session?.user) {
        setProfile(null); setDrivers([]); setVehicles([]); setTrips([]); setMaintenance([]); setLoading(false);
      }
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => { if (user) loadData(); }, [user]);

  async function loadData() {
    if (!user) return;
    setLoading(true); setMessage("");
    try {
      const { data: p, error: pe } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (pe) throw pe;
      if (!p || p.active === false) { await supabase.auth.signOut(); setMessage("Votre compte est désactivé."); return; }
      setProfile(p);
      const [d, v, t, m] = await Promise.all([
        getAllRows("drivers"), getAllRows("vehicles"), getAllRows("trips"), getAllRows("vehicle_maintenance")
      ]);
      setDrivers(d); setVehicles(v);
      setTrips(t.sort((a, b) => new Date(b.created_at || b.departure_at) - new Date(a.created_at || a.departure_at)));
      setMaintenance(m.sort((a, b) => new Date(b.maintenance_date) - new Date(a.maintenance_date)));
    } catch (e) {
      setMessage("Erreur de chargement : " + e.message + ". Vérifiez notamment la table vehicle_maintenance et ses autorisations RLS.");
    } finally { setLoading(false); }
  }

  async function login(e) {
    e.preventDefault(); setSaving(true); setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage("Connexion impossible : " + error.message);
    setSaving(false);
  }
  async function logout() {
    await supabase.auth.signOut(); setProfile(null); setUser(null); setShowLogin(false);
  }

  async function addDriver(e) {
    e.preventDefault();
    if (!isAdmin) return setMessage("Action réservée à l'administrateur.");
    const first = newDriverFirst.trim(), last = newDriverLast.trim(), matricule = newDriverMatricule.trim();
    if (!first || !last || !matricule) return setMessage("Veuillez saisir le prénom, le nom et le matricule.");
    setSaving(true);
    try {
      const { error } = await supabase.from("drivers").insert({ full_name: `${first} ${last}`, matricule, active: true });
      if (error) throw error;
      setNewDriverFirst(""); setNewDriverLast(""); setNewDriverMatricule(""); setMessage("Chauffeur ajouté."); await loadData();
    } catch (e) { setMessage("Échec de l'ajout : " + e.message); } finally { setSaving(false); }
  }
  async function addVehicle(e) {
    e.preventDefault();
    if (!isAdmin) return setMessage("Action réservée à l'administrateur.");
    const plate = newPlate.trim(), label = newLabel.trim();
    if (!plate || !label) return setMessage("Saisissez l'immatriculation et le modèle.");
    setSaving(true);
    try {
      const { error } = await supabase.from("vehicles").insert({ plate, label, active: true });
      if (error) throw error;
      setNewPlate(""); setNewLabel(""); setMessage("Véhicule ajouté."); await loadData();
    } catch (e) { setMessage("Échec de l'ajout : " + e.message); } finally { setSaving(false); }
  }

  async function editDriver(driver) {
    if (!isAdmin) return setMessage("Action réservée à l'administrateur.");
    const name = window.prompt("Nom et prénom :", driver.full_name);
    if (name === null || !name.trim()) return;
    const matricule = window.prompt("Matricule :", driver.matricule || "");
    if (matricule === null || !matricule.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("drivers").update({ full_name: name.trim(), matricule: matricule.trim() }).eq("id", driver.id);
      if (error) throw error; setMessage("Chauffeur modifié."); await loadData();
    } catch (e) { setMessage("Modification impossible : " + e.message); } finally { setSaving(false); }
  }
  async function editVehicle(vehicle) {
    if (!isAdmin) return setMessage("Action réservée à l'administrateur.");
    const plate = window.prompt("Immatriculation :", vehicle.plate);
    if (plate === null || !plate.trim()) return;
    const label = window.prompt("Modèle :", vehicle.label);
    if (label === null || !label.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("vehicles").update({ plate: plate.trim(), label: label.trim() }).eq("id", vehicle.id);
      if (error) throw error; setMessage("Véhicule modifié."); await loadData();
    } catch (e) { setMessage("Modification impossible : " + e.message); } finally { setSaving(false); }
  }
  async function deactivateDriver(driver) {
    if (!isAdmin) return setMessage("Action réservée à l'administrateur.");
    if (openTrips.some(t => String(t.driver_id) === String(driver.id))) return setMessage("Impossible : ce chauffeur a une mission en cours.");
    if (!window.confirm("Désactiver ce chauffeur ?")) return;
    setSaving(true);
    try { const { error } = await supabase.from("drivers").update({ active: false }).eq("id", driver.id); if (error) throw error; setMessage("Chauffeur désactivé."); await loadData(); }
    catch (e) { setMessage("Désactivation impossible : " + e.message); } finally { setSaving(false); }
  }
  async function deactivateVehicle(vehicle) {
    if (!isAdmin) return setMessage("Action réservée à l'administrateur.");
    if (openTrips.some(t => String(t.vehicle_id) === String(vehicle.id))) return setMessage("Impossible : ce véhicule est en mission.");
    if (!window.confirm("Désactiver ce véhicule ?")) return;
    setSaving(true);
    try { const { error } = await supabase.from("vehicles").update({ active: false }).eq("id", vehicle.id); if (error) throw error; setMessage("Véhicule désactivé."); await loadData(); }
    catch (e) { setMessage("Désactivation impossible : " + e.message); } finally { setSaving(false); }
  }
  async function deleteDriver(driver) {
    if (!isAdmin) return setMessage("Action réservée à l'administrateur.");
    if (!window.confirm(`Supprimer définitivement ${driver.full_name} ? Les anciennes missions doivent rester conservées.`)) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from("drivers").delete().eq("id", driver.id).select("id");
      if (error) throw error; if (!data?.length) throw new Error("Suppression refusée. Vérifiez les droits.");
      setMessage("Chauffeur supprimé. L'historique des missions est conservé."); await loadData();
    } catch (e) { setMessage("Suppression impossible : " + e.message); } finally { setSaving(false); }
  }
  async function deleteVehicle(vehicle) {
    if (!isAdmin) return setMessage("Action réservée à l'administrateur.");
    if (!window.confirm(`Supprimer définitivement ${vehicle.plate} - ${vehicle.label} ? Les anciennes missions et les fiches de vidange doivent rester conservées.`)) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from("vehicles").delete().eq("id", vehicle.id).select("id");
      if (error) throw error; if (!data?.length) throw new Error("Suppression refusée. Vérifiez les droits.");
      setMessage("Véhicule supprimé. L'historique des missions reste conservé."); await loadData();
    } catch (e) { setMessage("Suppression impossible : " + e.message); } finally { setSaving(false); }
  }

  async function addTrip(e) {
    e.preventDefault();
    if (!form.driver_name.trim() || !form.driver_matricule.trim() || !form.vehicle_name.trim() || !form.destination.trim() || form.departure_km === "") return setMessage("Veuillez remplir tous les champs obligatoires.");
    const km = Number(form.departure_km);
    if (!Number.isInteger(km) || km < 0) return setMessage("Kilométrage de départ invalide.");
    setSaving(true); setMessage(""); setNewTripCode("");
    const generatedCode = generateReturnCode();
    try {
      const { error } = await supabase.from("trips").insert({
        driver_id: null, driver_name: form.driver_name.trim(), driver_matricule: form.driver_matricule.trim(),
        vehicle_id: null, vehicle_name: form.vehicle_name.trim(), destination: form.destination.trim(),
        purpose: form.purpose.trim() || null, departure_km: km, departure_fuel_level: form.departure_fuel_level,
        notes: form.notes.trim() || null, departure_at: new Date().toISOString(), return_at: null,
        return_km: null, return_fuel_level: null, status: "out", client_id: user?.id || null, return_code: generatedCode
      });
      if (error) throw error;
      setForm(emptyForm); setNewTripCode(generatedCode);
      setMessage("Mission enregistrée. Conservez le code secret pour enregistrer le retour.");
      if (user) { setTab("trips"); await loadData(); }
    } catch (e) { setMessage("Échec de l'enregistrement : " + e.message); } finally { setSaving(false); }
  }

  async function finishTrip(trip) {
    const value = returnKm[trip.id];
    if (value === undefined || value === "") return setMessage("Saisissez le kilométrage au retour.");
    const km = Number(value);
    if (!Number.isInteger(km) || km < Number(trip.departure_km)) return setMessage("Le kilométrage de retour doit être supérieur ou égal au départ.");
    if (!returnFuel[trip.id]) return setMessage("Sélectionnez le niveau de carburant au retour.");
    if (!window.confirm("Confirmer le retour du véhicule ?")) return;
    setSaving(true); setMessage("");
    try {
      const { data, error } = await supabase.from("trips").update({
        return_km: km, return_fuel_level: returnFuel[trip.id], return_at: new Date().toISOString(), status: "returned"
      }).eq("id", trip.id).eq("status", "out").is("return_at", null).select("id");
      if (error) throw error; if (!data?.length) throw new Error("La mission n'a pas été mise à jour.");
      setMessage("Retour du véhicule enregistré."); await loadData();
    } catch (e) { setMessage("Échec du retour : " + e.message); } finally { setSaving(false); }
  }

  async function editTrip(trip) {
    if (!isAdmin) return setMessage("Modification réservée à l'administrateur.");
    const ask = (label, old) => window.prompt(label, old ?? "");
    const driver = ask("Nom du chauffeur :", trip.driver_name || ""); if (driver === null || !driver.trim()) return;
    const matricule = ask("Matricule :", trip.driver_matricule || ""); if (matricule === null) return;
    const vehicle = ask("Véhicule et immatriculation :", trip.vehicle_name || ""); if (vehicle === null || !vehicle.trim()) return;
    const destination = ask("Destination :", trip.destination || ""); if (destination === null || !destination.trim()) return;
    const purpose = ask("Motif :", trip.purpose || ""); if (purpose === null) return;
    const depText = ask("Kilométrage départ :", String(trip.departure_km ?? "")); if (depText === null) return;
    const dep = Number(depText); if (!depText.trim() || !Number.isInteger(dep) || dep < 0) return setMessage("Kilométrage départ invalide.");
    let ret = trip.return_km;
    if (ret !== null && ret !== undefined) {
      const retText = ask("Kilométrage retour :", String(ret)); if (retText === null) return;
      ret = Number(retText); if (!Number.isInteger(ret) || ret < dep) return setMessage("Kilométrage retour invalide.");
    }
    const notes = ask("Observations :", trip.notes || ""); if (notes === null) return;
    const depFuel = ask("Carburant au départ (Réserve, 1/4, 1/2, 3/4, Plein) :", trip.departure_fuel_level || "Non renseigné"); if (depFuel === null) return;
    const retFuel = trip.return_km == null ? null : ask("Carburant au retour :", trip.return_fuel_level || "Non renseigné");
    if (trip.return_km != null && retFuel === null) return;
    if (!window.confirm("Enregistrer les modifications de cette mission ?")) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("trips").update({
        driver_name: driver.trim(), driver_matricule: matricule.trim(), vehicle_name: vehicle.trim(),
        destination: destination.trim(), purpose: purpose.trim() || null, departure_km: dep, return_km: ret,
        notes: notes.trim() || null, departure_fuel_level: depFuel, return_fuel_level: retFuel
      }).eq("id", trip.id);
      if (error) throw error; setMessage("Mission modifiée."); await loadData();
    } catch (e) { setMessage("Modification impossible : " + e.message); } finally { setSaving(false); }
  }

  async function registerAnonymousReturn(e) {
    e.preventDefault();
    const code = returnCodeInput.trim().toUpperCase(), km = Number(returnKmInput);
    if (!code || code.length < 12) return setMessage("Saisissez un code secret valide.");
    if (returnKmInput === "" || !Number.isInteger(km) || km < 0) return setMessage("Saisissez un kilométrage de retour valide.");
    if (!returnFuelInput) return setMessage("Sélectionnez le carburant au retour.");
    if (!window.confirm("Confirmer l'enregistrement du retour ?")) return;
    setSaving(true); setMessage("");
    try {
      const { data, error } = await supabase.rpc("register_trip_return", {
        p_return_code: code, p_return_km: km, p_return_fuel_level: returnFuelInput
      });
      if (error) throw error;
      if (data !== true) throw new Error("Code invalide, mission déjà clôturée ou kilométrage incorrect.");
      setReturnCodeInput(""); setReturnKmInput(""); setReturnFuelInput("Plein"); setNewTripCode("");
      setMessage("Retour du véhicule enregistré avec succès.");
      if (user) await loadData();
    } catch (e) { setMessage("Impossible d'enregistrer le retour : " + e.message); } finally { setSaving(false); }
  }

  async function addMaintenance(e) {
    e.preventDefault();
    if (!isAdmin) return setMessage("Action réservée à l'administrateur.");
    const vehicle = vehicles.find(v => String(v.id) === String(maintenanceVehicle));
    const km = Number(maintenanceKm), interval = Number(maintenanceInterval);
    if (!vehicle) return setMessage("Sélectionnez un véhicule.");
    if (maintenanceKm === "" || !Number.isInteger(km) || km < 0) return setMessage("Kilométrage de vidange invalide.");
    if (!Number.isInteger(interval) || interval < 1000) return setMessage("L'intervalle doit être au minimum de 1 000 KM.");
    setSaving(true); setMessage("");
    try {
      const { error } = await supabase.from("vehicle_maintenance").insert({
        vehicle_id: vehicle.id, vehicle_plate: vehicle.plate, maintenance_type: "VIDANGE",
        maintenance_date: maintenanceDate, odometer_km: km, interval_km: interval,
        next_service_km: km + interval, notes: maintenanceNotes.trim() || null
      });
      if (error) throw error;
      setMaintenanceKm(""); setMaintenanceNotes(""); setMaintenanceInterval("10000");
      setMessage(`Vidange enregistrée pour ${vehicle.plate}. Prochaine vidange à ${km + interval} KM.`);
      await loadData();
    } catch (e) { setMessage("Impossible d'enregistrer la vidange : " + e.message); } finally { setSaving(false); }
  }

  async function copyReturnCode() {
    try { await navigator.clipboard.writeText(newTripCode); setMessage("Code secret copié."); }
    catch { setMessage("Copie impossible. Veuillez conserver le code manuellement."); }
  }

  function latestMaintenance(vehicle) {
    return maintenance.filter(m => String(m.vehicle_id) === String(vehicle.id) || (!m.vehicle_id && m.vehicle_plate === vehicle.plate))
      .sort((a, b) => new Date(b.maintenance_date) - new Date(a.maintenance_date))[0];
  }
  function maintenanceStatus(vehicle) {
    const last = latestMaintenance(vehicle);
    if (!last) return { label: "Aucune vidange enregistrée", color: "#64748b" };
    const km = Number(currentKm[vehicle.id]);
    if (currentKm[vehicle.id] === undefined || currentKm[vehicle.id] === "") return { label: `Prochaine vidange : ${last.next_service_km} KM`, color: "#1769ff" };
    const left = Number(last.next_service_km) - km;
    if (left <= 0) return { label: `Vidange en retard de ${Math.abs(left)} KM`, color: "#dc2626" };
    if (left <= 1000) return { label: `Vidange bientôt : dans ${left} KM`, color: "#d97706" };
    return { label: `Vidange OK : ${left} KM restants`, color: "#15803d" };
  }

  const footer = <div style={{ textAlign: "center", padding: 20, color: "#64748b", fontWeight: "bold" }}>{APP_NAME} © 2026<div style={{ fontSize: 11, marginTop: 5, letterSpacing: 1, color: "#1769ff" }}>{APP_SUBTITLE}</div></div>;
  const fuelSelect = (value, onChange, required = true) => <select style={css.input} value={value} onChange={e => onChange(e.target.value)} required={required}><option value="">Sélectionner...</option>{FUEL_LEVELS.map(x => <option key={x} value={x}>{x}</option>)}</select>;
  const tripForm = <form onSubmit={addTrip}>
    <label>Nom et prénom du chauffeur</label><input style={css.input} placeholder="Nom et prénom" value={form.driver_name} onChange={e => setFormValue("driver_name", e.target.value)} required/>
    <label>Matricule du chauffeur</label><input style={css.input} placeholder="Matricule" value={form.driver_matricule} onChange={e => setFormValue("driver_matricule", e.target.value)} required/>
    <label>Véhicule et immatriculation</label><input style={css.input} placeholder="Ex. : Dacia Logan - 12345-A-6" value={form.vehicle_name} onChange={e => setFormValue("vehicle_name", e.target.value)} required/>
    <label>Destination</label><input style={css.input} value={form.destination} onChange={e => setFormValue("destination", e.target.value)} required/>
    <label>Motif de la mission</label><input style={css.input} value={form.purpose} onChange={e => setFormValue("purpose", e.target.value)}/>
    <label>Compteur au départ (KM)</label><input style={css.input} type="number" min="0" step="1" value={form.departure_km} onChange={e => setFormValue("departure_km", e.target.value)} required/>
    <label>Niveau de carburant au départ</label>{fuelSelect(form.departure_fuel_level, v => setFormValue("departure_fuel_level", v))}
    <label>Observations</label><textarea style={css.input} value={form.notes} onChange={e => setFormValue("notes", e.target.value)}/>
    <button style={css.button} disabled={saving}>{saving ? "Enregistrement..." : "Enregistrer la mission"}</button>
  </form>;

  if (loading) return <div style={{ ...css.page, padding: 40, textAlign: "center" }}><div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}><GigrLogo/></div>Chargement de GGR PARC AUTO...</div>;

  if (!user) return <div style={css.page}>
    <header style={css.header}><div><GigrLogo/><div style={{ marginTop: 8, fontSize: 13, color: "#64748b" }}>Gestion du parc automobile et des missions</div></div><button style={css.secondary} onClick={() => setShowLogin(!showLogin)}>{showLogin ? "Nouvelle mission" : "Accès administrateur"}</button></header>
    <main style={css.container}>
      {message && <div style={{ ...css.card, borderLeft: "5px solid #1769ff" }}>{message}<button style={css.secondary} onClick={() => setMessage("")}>Fermer</button></div>}
      {showLogin ? <section style={css.card}><h3>🔐 Connexion administrateur</h3><form onSubmit={login}><label>Adresse e-mail</label><input style={css.input} type="email" value={email} onChange={e => setEmail(e.target.value)} required/><label>Mot de passe</label><input style={css.input} type="password" value={password} onChange={e => setPassword(e.target.value)} required/><button style={css.button} disabled={saving}>{saving ? "Connexion..." : "Se connecter"}</button></form></section> :
      <section style={css.card}><h3>🚘 Enregistrer une nouvelle mission</h3><p>Vous pouvez enregistrer une mission sans compte.</p>{tripForm}</section>}
      {newTripCode && <section style={{ ...css.card, border: "2px solid #1769ff", textAlign: "center" }}><h3>Mission enregistrée</h3><p>Conservez ce code secret pour enregistrer le retour :</p><h2 style={{ direction: "ltr", letterSpacing: 3, color: "#1769ff", overflowWrap: "anywhere" }}>{newTripCode}</h2><button style={css.button} onClick={copyReturnCode}>Copier le code</button></section>}
      <section style={css.card}><h3>🔑 Enregistrer le retour du véhicule</h3><p>Saisissez le code secret remis lors du départ.</p><form onSubmit={registerAnonymousReturn}><label>Code secret</label><input style={css.input} value={returnCodeInput} onChange={e => setReturnCodeInput(e.target.value)} required/><label>Compteur au retour (KM)</label><input style={css.input} type="number" min="0" step="1" value={returnKmInput} onChange={e => setReturnKmInput(e.target.value)} required/><label>Niveau de carburant au retour</label>{fuelSelect(returnFuelInput, setReturnFuelInput)}<button style={css.button} disabled={saving}>{saving ? "Enregistrement..." : "Confirmer le retour"}</button></form></section>
      {footer}
    </main>
  </div>;

  const nav = (key, label) => <button style={tab === key ? css.button : css.secondary} onClick={() => setTab(key)}>{label}</button>;

  return <div style={css.page}>
    <header style={css.header}><div><GigrLogo/><div style={{ marginTop: 8, fontSize: 13, color: "#64748b" }}>Gestion du parc automobile et des missions</div><small>{profile?.full_name || user.email}</small></div><button style={css.danger} onClick={logout}>Déconnexion</button></header>
    <main style={css.container}>
      {message && <div style={{ ...css.card, borderLeft: "5px solid #1769ff" }}>{message}<button style={css.secondary} onClick={() => setMessage("")}>Fermer</button></div>}
      <div style={css.grid}>{[["Véhicules enregistrés", vehicles.length], ["Chauffeurs enregistrés", drivers.length], ["Missions en cours", openTrips.length], ["Missions terminées", completedTrips.length]].map(([label, value]) => <div key={label} style={{ ...css.card, borderTop: "3px solid #1769ff", marginBottom: 0 }}><div style={{ color: "#64748b" }}>{label}</div><h2 style={{ marginBottom: 0, color: "#1769ff" }}>{value}</h2></div>)}</div>
      <div style={{ ...css.card, display: "flex", flexWrap: "wrap", gap: 5, marginTop: 18 }}>
        {nav("trips", "Missions en cours / terminées")}{nav("new", "Nouvelle mission")}{nav("history", "Historique")}{nav("vehicles", "Véhicules")}{nav("drivers", "Chauffeurs")}{nav("maintenance", "Vidanges")}
      </div>

      {tab === "new" && <section style={css.card}><h3>🚘 Nouvelle mission</h3>{tripForm}{newTripCode && <div style={{ border: "2px solid #1769ff", borderRadius: 10, padding: 15, marginTop: 15, textAlign: "center", background: "#f0f5ff" }}><h3>Code secret de retour</h3><h2 style={{ color: "#1769ff", overflowWrap: "anywhere" }}>{newTripCode}</h2><button style={css.button} onClick={copyReturnCode}>Copier le code</button></div>}</section>}

      {tab === "trips" && <>
        <section style={css.card}><h3 style={{ color: "#1769ff" }}>🚗 Missions en cours</h3>{openTrips.length === 0 && <p>Aucune mission en cours.</p>}
          {openTrips.map(t => <div key={t.id} style={{ borderBottom: "1px solid #e2e8f0", padding: "14px 0" }}>
            <b>{t.destination}</b><p>Véhicule : {t.vehicle_name || vehicleName(t.vehicle_id)}</p><p>Chauffeur : {t.driver_name || driverName(t.driver_id)} — Matricule : {t.driver_matricule || driverMatricule(t.driver_id)}</p><p>Compteur départ : {t.departure_km} KM</p><p>Carburant départ : {t.departure_fuel_level || "Non renseigné"}</p><p>Départ : {formatDateTime(t.departure_at)}</p>
            <label>Compteur au retour (KM)</label><input style={css.input} type="number" min={t.departure_km} step="1" value={returnKm[t.id] || ""} onChange={e => setReturnKm(p => ({ ...p, [t.id]: e.target.value }))}/>
            <label>Carburant au retour</label>{fuelSelect(returnFuel[t.id] || "Plein", v => setReturnFuel(p => ({ ...p, [t.id]: v })))}
            <button style={css.button} disabled={saving} onClick={() => finishTrip(t)}>Enregistrer le retour</button>
            {isAdmin && <button style={css.secondary} disabled={saving} onClick={() => editTrip(t)}>✏️ Modifier</button>}
          </div>)}
        </section>
        <section style={css.card}><h3 style={{ color: "#1769ff" }}>✅ Missions terminées</h3>{completedTrips.length === 0 && <p>Aucune mission terminée.</p>}
          {completedTrips.map(t => <div key={t.id} style={{ borderBottom: "1px solid #e2e8f0", padding: 12 }}><b>{t.destination}</b><p>Véhicule : {t.vehicle_name || vehicleName(t.vehicle_id)}</p><p>Chauffeur : {t.driver_name || driverName(t.driver_id)} — Matricule : {t.driver_matricule || driverMatricule(t.driver_id)}</p><p>Compteur : {t.departure_km} → {t.return_km} KM ({Number(t.return_km) - Number(t.departure_km)} KM parcourus)</p><p>Carburant : {t.departure_fuel_level || "Non renseigné"} → {t.return_fuel_level || "Non renseigné"}</p><p>Départ : {formatDateTime(t.departure_at)}</p><p>Retour : {formatDateTime(t.return_at)}</p>{isAdmin && <button style={css.secondary} onClick={() => editTrip(t)}>✏️ Modifier</button>}</div>)}
        </section>
      </>}

      {tab === "history" && <section style={css.card} id="print-history"><style>{`@media print { body * { visibility:hidden !important; } #print-history,#print-history * { visibility:visible !important; } #print-history { position:absolute;top:0;left:0;width:100%;background:white;color:black;box-shadow:none; } .no-print { display:none !important; } }`}</style>
        <h2>📋 Historique de toutes les missions</h2><div className="no-print"><label>Recherche</label><input style={css.input} placeholder="Chauffeur, matricule, véhicule, destination..." value={historySearch} onChange={e => setHistorySearch(e.target.value)}/><label>État</label><select style={css.input} value={historyStatus} onChange={e => setHistoryStatus(e.target.value)}><option value="all">Toutes les missions</option><option value="out">En cours</option><option value="returned">Terminées</option></select><button style={css.button} onClick={() => window.print()}>🖨️ Imprimer l'historique</button><button style={css.secondary} onClick={loadData}>Actualiser ↻</button></div>
        <p>Nombre de missions : <b>{filteredTrips.length}</b></p>
        {filteredTrips.length === 0 ? <p>Aucun résultat.</p> : filteredTrips.map(t => <div key={t.id} style={{ borderBottom: "1px solid #e2e8f0", padding: 14, marginBottom: 10, pageBreakInside: "avoid" }}><h3>{t.destination}</h3><p>Chauffeur : {t.driver_name || driverName(t.driver_id)} — Matricule : {t.driver_matricule || driverMatricule(t.driver_id)}</p><p>Véhicule : {t.vehicle_name || vehicleName(t.vehicle_id)}</p><p>Motif : {t.purpose || "Non renseigné"}</p><p>Compteur départ : {t.departure_km} KM | Retour : {t.return_km ?? "En cours"}</p><p>Distance : {t.return_km != null ? `${Number(t.return_km) - Number(t.departure_km)} KM` : "En cours"}</p><p>Carburant départ : {t.departure_fuel_level || "Non renseigné"} | retour : {t.return_fuel_level || "Non renseigné"}</p><p>État : {t.status === "returned" ? "Terminée" : "En cours"}</p><p>Départ : {formatDateTime(t.departure_at)} | Retour : {formatDateTime(t.return_at)}</p>{t.notes && <p>Observations : {t.notes}</p>}{isAdmin && <div className="no-print"><button style={css.button} onClick={() => editTrip(t)} disabled={saving}>✏️ Modifier la mission</button></div>}</div>)}
      </section>}

      {tab === "drivers" && <section style={css.card}><h3 style={{ color: "#1769ff" }}>Liste des chauffeurs</h3>
        {isAdmin && <form onSubmit={addDriver}><div style={css.grid}><div><label>Prénom</label><input style={css.input} value={newDriverFirst} onChange={e => setNewDriverFirst(e.target.value)} required/></div><div><label>Nom</label><input style={css.input} value={newDriverLast} onChange={e => setNewDriverLast(e.target.value)} required/></div><div><label>Matricule</label><input style={css.input} value={newDriverMatricule} onChange={e => setNewDriverMatricule(e.target.value)} required/></div></div><button style={css.button} disabled={saving}>Ajouter un chauffeur</button></form>}
        {drivers.map(d => <div key={d.id} style={{ padding: 12, borderBottom: "1px solid #e2e8f0" }}><b>{d.full_name}</b><p>Matricule : {d.matricule || "Non renseigné"} — {d.active === false ? "Désactivé" : "Actif"}</p>{isAdmin && <><button style={css.secondary} onClick={() => editDriver(d)} disabled={saving}>Modifier</button>{d.active !== false && <button style={css.danger} onClick={() => deactivateDriver(d)} disabled={saving}>Désactiver</button>}<button style={css.danger} onClick={() => deleteDriver(d)} disabled={saving}>Supprimer définitivement</button></>}</div>)}
      </section>}

      {tab === "vehicles" && <section style={css.card}><h3 style={{ color: "#1769ff" }}>Parc des véhicules</h3>
        {isAdmin && <form onSubmit={addVehicle}><div style={css.grid}><div><label>Immatriculation</label><input style={css.input} value={newPlate} onChange={e => setNewPlate(e.target.value)} placeholder="12345-A-6" required/></div><div><label>Modèle du véhicule</label><input style={css.input} value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Dacia Logan" required/></div></div><button style={css.button} disabled={saving}>Ajouter un véhicule</button></form>}
        {vehicles.map(v => { const last = latestMaintenance(v); const status = maintenanceStatus(v); return <div key={v.id} style={{ padding: 12, borderBottom: "1px solid #e2e8f0" }}><b>{v.plate} — {v.label}</b><p>{v.active === false ? "Désactivé" : "Actif"}</p><p>Dernière vidange : {last ? `${last.odometer_km} KM — ${last.maintenance_date}` : "Aucune"}</p><p>Prochaine vidange : {last ? `${last.next_service_km} KM` : "À définir"}</p><p style={{ color: status.color, fontWeight: "bold" }}>{status.label}</p><label>Kilométrage actuel pour vérifier l'alerte (KM)</label><input style={css.input} type="number" min="0" step="1" placeholder="Saisir le kilométrage actuel" value={currentKm[v.id] ?? ""} onChange={e => setCurrentKm(p => ({ ...p, [v.id]: e.target.value }))}/>{isAdmin && <><button style={css.secondary} onClick={() => { setMaintenanceVehicle(String(v.id)); setTab("maintenance"); }}>Enregistrer une vidange</button><button style={css.secondary} onClick={() => editVehicle(v)} disabled={saving}>Modifier</button>{v.active !== false && <button style={css.danger} onClick={() => deactivateVehicle(v)} disabled={saving}>Désactiver</button>}<button style={css.danger} onClick={() => deleteVehicle(v)} disabled={saving}>Supprimer définitivement</button></>}</div>; })}
      </section>}

      {tab === "maintenance" && <section style={css.card}><h3 style={{ color: "#1769ff" }}>🛠️ Suivi des vidanges</h3>
        {isAdmin && <form onSubmit={addMaintenance}><div style={css.grid}><div><label>Véhicule</label><select style={css.input} value={maintenanceVehicle} onChange={e => setMaintenanceVehicle(e.target.value)} required><option value="">Choisir un véhicule</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.plate} — {v.label}</option>)}</select></div><div><label>Date de vidange</label><input style={css.input} type="date" value={maintenanceDate} onChange={e => setMaintenanceDate(e.target.value)} required/></div><div><label>Compteur lors de la vidange (KM)</label><input style={css.input} type="number" min="0" step="1" value={maintenanceKm} onChange={e => setMaintenanceKm(e.target.value)} required/></div><div><label>Intervalle avant prochaine vidange (KM)</label><input style={css.input} type="number" min="1000" step="500" value={maintenanceInterval} onChange={e => setMaintenanceInterval(e.target.value)} required/></div></div><label>Observations</label><textarea style={css.input} value={maintenanceNotes} onChange={e => setMaintenanceNotes(e.target.value)} placeholder="Type d'huile, filtre, remarques..."/><button style={css.button} disabled={saving}>Enregistrer la vidange</button></form>}
        <p>Intervalle conseillé par défaut : 10 000 KM. Vous pouvez le modifier pour chaque opération.</p><h3>Historique des vidanges</h3>
        {maintenance.length === 0 ? <p>Aucune vidange enregistrée.</p> : maintenance.map(m => <div key={m.id} style={{ borderBottom: "1px solid #e2e8f0", padding: 12 }}><b>{m.vehicle_plate || vehicles.find(v => String(v.id) === String(m.vehicle_id))?.plate || "Véhicule supprimé"}</b><p>Date : {m.maintenance_date}</p><p>Compteur à la vidange : {m.odometer_km} KM</p><p>Intervalle : {m.interval_km} KM</p><p>Prochaine vidange : {m.next_service_km} KM</p>{m.notes && <p>Observations : {m.notes}</p>}</div>)}
      </section>}

      {footer}
      <button style={css.secondary} onClick={loadData} disabled={loading || saving}>Actualiser les données ↻</button>
    </main>
  </div>;
}
