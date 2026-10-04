import { Link } from 'react-router-dom'
import { cx } from '../../utils/classNames'

export function buttonClassName({ variant = 'secondary', size = 'md', iconOnly = false, block = false, className } = {}) {
  return cx('btn', `btn--${variant}`, `btn--${size}`, iconOnly && 'btn--icon', block && 'btn--block', className)
}

function ButtonContent({ icon, children }) {
  return (
    <>
      {icon && <span className="btn__icon" aria-hidden="true">{icon}</span>}
      {children != null && <span className="btn__label">{children}</span>}
    </>
  )
}

// variant: primary | secondary | ghost | danger    size: sm | md | lg | xl
export function Button({ variant, size, iconOnly, block, icon, className, children, type = 'button', ...rest }) {
  return (
    <button type={type} className={buttonClassName({ variant, size, iconOnly, block, className })} {...rest}>
      <ButtonContent icon={icon}>{children}</ButtonContent>
    </button>
  )
}

export function ButtonLink({ variant, size, iconOnly, block, icon, className, children, ...rest }) {
  return (
    <Link className={buttonClassName({ variant, size, iconOnly, block, className })} {...rest}>
      <ButtonContent icon={icon}>{children}</ButtonContent>
    </Link>
  )
}
