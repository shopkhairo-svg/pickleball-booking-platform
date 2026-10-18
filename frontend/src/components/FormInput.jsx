export default function FormInput({ label, icon, type = "text", value, onChange, placeholder, children }) {
    return (
        <div className="space-y-2">
            <label className="block px-1 text-sm font-bold text-on-surface">{label}</label>
            <div className="relative group">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px] transition-colors group-focus-within:text-primary">
                    {icon}
                </span>
                <input
                    className="field-control pl-11 pr-11"
                    type={type} value={value} onChange={onChange} placeholder={placeholder} required
                />
                {children}
            </div>
        </div>
    );
}
