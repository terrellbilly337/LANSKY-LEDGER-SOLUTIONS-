
import math

def js_round(n):
    """
    Emulates JavaScript's Math.round() behavior (Round Half Up).
    Python's default round() uses Round Half To Even (Banker's Rounding).
    """
    if n - math.floor(n) < 0.5:
        return math.floor(n)
    return math.ceil(n)

def run_lansky_validation():
    print("--------------------------------------------------")
    print("   LANSKY LEDGER SOLUTIONS | LOGIC VALIDATOR      ")
    print("--------------------------------------------------")

    # --- INPUTS ---
    # Storing values in Cents (Integer) to match App Architecture
    inventory_item_1_cost = 1200  # $12.00
    inventory_item_2_cost = 1800  # $18.00
    
    bundle_sale_price = 11000     # $110.00
    shipping_cost = 750           # $7.50
    marketplace_fee = 1100        # $11.00 (10%)
    
    tax_preset_percentage = 33.0  # 33%

    # --- LOGIC EXECUTION ---

    # 1. COGS Calculation
    # Logic: Sum of individual item costs
    total_cogs = inventory_item_1_cost + inventory_item_2_cost
    
    # 2. Gross Profit Calculation
    # Logic: Revenue - COGS - Expenses
    # Note: In the app, Net Profit (Balance) is calculated as Total Income - Total Expense.
    # For a single transaction analysis:
    # Income = 11000
    # Expense = 750 (Ship) + 1100 (Fee) + 3000 (COGS - effectively)
    gross_profit = bundle_sale_price - total_cogs - shipping_cost - marketplace_fee

    # 3. Tax Reserve Calculation
    # Logic: Net Profit * (TaxRate / 100)
    # Must use accurate float multiplication then round to nearest cent
    estimated_tax_raw = gross_profit * (tax_preset_percentage / 100.0)
    estimated_tax = js_round(estimated_tax_raw)

    # 4. Final Net Profit (Post-Tax)
    final_net_profit = gross_profit - estimated_tax

    # 5. Color Bar Logic
    # Logic: Green (0-10%), Yellow (11-25%), Red (26%+)
    # Calculated as (Tax / Available Cash) * 100
    # Available Cash in this isolated scenario is the Gross Profit before tax payment
    liability_ratio = (estimated_tax / gross_profit) * 100
    
    bar_color = "GREEN"
    if liability_ratio > 25:
        bar_color = "RED"
    elif liability_ratio > 10:
        bar_color = "YELLOW"

    # --- VERIFICATION ---
    
    expected_net_profit = 4120 # $41.20
    expected_color = "RED"

    print(f"Inventory COGS:      ${total_cogs/100:.2f}")
    print(f"Gross Profit:        ${gross_profit/100:.2f}")
    print(f"Tax Reserve (33%):   ${estimated_tax/100:.2f} (Raw: {estimated_tax_raw/100:.4f})")
    print(f"Final Net Profit:    ${final_net_profit/100:.2f}")
    print(f"Liability Ratio:     {liability_ratio:.2f}%")
    print(f"Visual Indicator:    {bar_color}")
    print("--------------------------------------------------")

    if final_net_profit == expected_net_profit and bar_color == expected_color:
        print("STATUS: PASS")
        print("Logic integrity confirmed. No discrepancies found.")
    else:
        print("STATUS: FAIL")
        if final_net_profit != expected_net_profit:
            print(f"ERROR: Net Profit Mismatch. Expected ${expected_net_profit/100:.2f}, Got ${final_net_profit/100:.2f}")
        if bar_color != expected_color:
            print(f"ERROR: Color Logic Mismatch. Expected {expected_color}, Got {bar_color}")

if __name__ == "__main__":
    run_lansky_validation()
