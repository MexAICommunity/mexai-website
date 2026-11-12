import { useState } from 'react';

interface MobileMenuProps {
	eventsUrl: string;
}

export default function MobileMenu({ eventsUrl }: MobileMenuProps) {
	const [open, setOpen] = useState(false);

	return (
		<div className="mobile-menu">
			<button className="menu-toggle" type="button" aria-label="Abrir menú" aria-expanded={open} onClick={() => setOpen(!open)}><span></span><span></span></button>
			{open && <div className="mobile-panel"><a href="/encuentros/" onClick={() => setOpen(false)}>Encuentros</a><a href="/nosotros" onClick={() => setOpen(false)}>Nosotros</a><a href="/#propon-charla" onClick={() => setOpen(false)}>Propón tu charla</a><a className="button button-primary" href={eventsUrl} target="_blank" rel="noreferrer">Ver eventos ↗</a></div>}
		</div>
	);
}