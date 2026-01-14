import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";

export default function Toast({ message, type = "success", show }) {
  return (
    <div
      className={`toast-notification ${type === "error" ? "error" : "success"} ${
        show ? "show" : ""
      }`}
    >
      {type === "success" ? (
        <FaCheckCircle className="mr-2 text-lg" />
      ) : (
        <FaTimesCircle className="mr-2 text-lg" />
      )}
      <span className="font-medium text-sm">{message}</span>
    </div>
  );
}
