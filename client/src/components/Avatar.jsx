export default function Avatar({ user, size = 10, className = '' }) {
  const sizeClass = `w-${size} h-${size}`;
  if (user?.avatar) {
    return (
      <img
        src={`${user.avatar}`}
        className={`${sizeClass} rounded-full object-cover ring-1 ring-accent/20 ${className}`}
        alt={user.displayName}
      />
    );
  }
  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br from-accent to-cyan-300 flex items-center justify-center text-bg font-black text-sm flex-shrink-0 ${className}`}>
      {user?.displayName?.[0] || '?'}
    </div>
  );
}
