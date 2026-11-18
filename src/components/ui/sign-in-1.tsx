import * as React from 'react';
import { Button } from '../UI';

type AuthAction = {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
};

interface AuthFormProps extends React.HTMLAttributes<HTMLDivElement> {
  logo?: React.ReactNode;
  logoSrc?: string;
  logoAlt?: string;
  title: string;
  description?: string;
  primaryAction: AuthAction;
  isLoading?: boolean;
  secondaryActions?: AuthAction[];
  secondaryLabel?: string;
  secondaryDescription?: string;
  separatorLabel?: string;
  skipAction?: AuthAction;
  footerContent?: React.ReactNode;
}

const AuthForm = React.forwardRef<HTMLDivElement, AuthFormProps>(function AuthForm({
  className = '', logo, logoSrc, logoAlt = '', title, description, primaryAction,
  isLoading = false, secondaryActions, secondaryLabel = 'Explore the demo',
  secondaryDescription, separatorLabel = 'or', skipAction, footerContent, children, ...props
}, ref) {
  const titleId = React.useId();
  const descriptionId = React.useId();
  return <div ref={ref} className={`auth-form ${className}`} {...props}>
    <section className="auth-card" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined}>
      <header className="auth-card-header">
        {(logo || logoSrc) && <div className="auth-logo">{logo ?? <img src={logoSrc} alt={logoAlt} width={48} height={48} />}</div>}
        <h1 id={titleId}>{title}</h1>
        {description && <p id={descriptionId}>{description}</p>}
      </header>
      <div className="auth-card-content">
        {children}
        <Button variant="secondary" className="auth-primary" onClick={primaryAction.onClick}
          isLoading={isLoading} disabled={primaryAction.disabled}>
          {!isLoading && primaryAction.icon}<span>{primaryAction.label}</span>
        </Button>
        {!!secondaryActions?.length && <>
          <div className="auth-separator"><span>{separatorLabel}</span></div>
          <details className="auth-secondary">
            <summary>{secondaryLabel}</summary>
            {secondaryDescription && <p>{secondaryDescription}</p>}
            <div className="auth-secondary-actions">
              {secondaryActions.map(action => <Button key={action.label} variant="secondary"
                disabled={isLoading || action.disabled} onClick={action.onClick}>
                {action.icon}<span><strong>{action.label}</strong>{action.description && <small>{action.description}</small>}</span>
              </Button>)}
            </div>
          </details>
        </>}
        {skipAction && <Button variant="secondary" disabled={isLoading || skipAction.disabled}
          onClick={skipAction.onClick}>{skipAction.icon}{skipAction.label}</Button>}
      </div>
    </section>
    {footerContent && <footer className="auth-footer">{footerContent}</footer>}
  </div>;
});

export { AuthForm };
export type { AuthFormProps };
