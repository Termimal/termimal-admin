interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { label: string }

export default function Input({ label, ...props }: InputProps) {
  return (
    <div className="mb-4">
      <label className="block text-[0.72rem] font-medium mb-1.5" style={{ color: 'var(--t3)' }}>{label}</label>
    </div>
  )
}
