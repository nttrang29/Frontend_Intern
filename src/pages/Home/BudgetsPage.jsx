import React, { useState } from "react";
import "../../styles/home/BudgetsPage.css";

export default function BudgetsPage() {
  const [budgets] = useState([
    { id: 1, name: "Gia đình", limit: 5000000, spent: 3200000, month: "11/2025" },
    { id: 2, name: "Cá nhân", limit: 3000000, spent: 2800000, month: "11/2025" },
  ]);

  const handleAddBudget = () => alert("Thêm hạn mức chi tiêu mới!");

  return (
    <div className="budget-page container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-semibold text-dark">Hạn mức chi tiêu</h3>
        <button className="btn btn-gradient d-flex align-items-center" onClick={handleAddBudget}>
          <i className="bi bi-plus-circle me-2"></i>
          Thêm hạn mức
        </button>
      </div>

      <div className="row g-4">
        {budgets.map((b) => {
          const percent = Math.min((b.spent / b.limit) * 100, 100);
          const isOver = percent >= 100;
          return (
            <div className="col-md-6 col-lg-4" key={b.id}>
              <div className="budget-card card border-0 shadow-sm">
                <div className="card-body">
                  <div className="d-flex justify-content-between mb-2">
                    <h5 className="mb-0 fw-bold">{b.name}</h5>
                    <span className="badge bg-light text-dark">{b.month}</span>
                  </div>
                  <div className="progress mb-2" style={{ height: 10 }}>
                    <div
                      className={`progress-bar ${isOver ? "bg-danger" : "bg-gradient"}`}
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                  <div className="d-flex justify-content-between small text-secondary">
                    <span>Đã chi: {b.spent.toLocaleString()} đ</span>
                    <span>Giới hạn: {b.limit.toLocaleString()} đ</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
