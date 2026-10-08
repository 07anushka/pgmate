import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  Trash2,
} from "lucide-react";

import "./MessageCard.css";

function MessageCard({
  type = "success",
  title,
  message,
  onClose,
  confirm = false,
  onConfirm,
  confirmText = "Confirm",
  cancelText = "Cancel",
}) {
  const config = {
    success: {
      icon: CheckCircle2,
      label: "SUCCESS",
    },

    error: {
      icon: AlertCircle,
      label: "ERROR",
    },

    warning: {
      icon: AlertTriangle,
      label: "WARNING",
    },

    confirm: {
      icon: Trash2,
      label: "CONFIRM",
    },
  };

  const current =
    config[type] || config.success;

  const Icon = current.icon;

  const handleOverlayClick = (
    event
  ) => {
    if (
      event.target ===
      event.currentTarget
    ) {
      if (!confirm) {
        onClose?.();
      }
    }
  };

  return (
    <div
      className="message-card-overlay"
      onMouseDown={
        handleOverlayClick
      }
    >
      <div
        className={`message-card message-card-${type}`}
        role="dialog"
        aria-modal="true"
      >
        {/* TOP ICON */}
        <div className="message-card-icon">
          <Icon size={27} />
        </div>

        {/* CLOSE */}
        {!confirm && (
          <button
            type="button"
            className="message-card-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={19} />
          </button>
        )}

        {/* CONTENT */}
        <div className="message-card-content">
          <span className="message-card-label">
            {current.label}
          </span>

          <h2>
            {title ||
              (type === "success"
                ? "Success"
                : type === "error"
                ? "Something went wrong"
                : type === "warning"
                ? "Please check"
                : "Are you sure?")}
          </h2>

          <p>
            {message ||
              "Please try again."}
          </p>
        </div>

        {/* ACTIONS */}
        {confirm ? (
          <div className="message-card-actions">
            <button
              type="button"
              className="message-card-cancel"
              onClick={onClose}
            >
              {cancelText}
            </button>

            <button
              type="button"
              className="message-card-confirm"
              onClick={onConfirm}
            >
              <Trash2 size={15} />
              {confirmText}
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="message-card-ok"
            onClick={onClose}
          >
            Okay
          </button>
        )}
      </div>
    </div>
  );
}

export default MessageCard;