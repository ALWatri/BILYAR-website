import { useState, useEffect } from "react";
import { AdminLayout } from "./AdminLayout";
import { MessageCircle, Send, Package, Truck, Mail, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface WhatsAppStatus {
  configured: boolean;
  contentSids?: { orderReceived: string; orderShipped: string; marketing: string };
  templates?: { orderReceived: string; orderShipped: string; marketing: string };
}

interface Customer {
  id?: string;
  name: string;
  phone: string;
  email?: string;
}

export default function WhatsApp() {
  const [lang, setLang] = useState<"en" | "ar">("en");
  const [message, setMessage] = useState("");
  const [selectedPhones, setSelectedPhones] = useState<Set<string>>(new Set());
  const [manualPhones, setManualPhones] = useState("");
  const [testOrderId, setTestOrderId] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const checkLang = () => setLang((localStorage.getItem("lang") as "en" | "ar") || "en");
    checkLang();
    const observer = new MutationObserver(checkLang);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => observer.disconnect();
  }, []);

  const { data: status = { configured: false, templates: {} } } = useQuery<WhatsAppStatus>({
    queryKey: ["/api/whatsapp/status"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const sendMarketingMutation = useMutation({
    mutationFn: async (payload: { phones: string[]; message: string }) => {
      const res = await fetch("/api/whatsapp/send-marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      const failed = data.results?.filter((r: { ok: boolean }) => !r.ok).length || 0;
      const sent = data.results?.filter((r: { ok: boolean }) => r.ok).length || 0;
      toast({ title: `Sent: ${sent}${failed ? `, Failed: ${failed}` : ""}` });
      setMessage("");
      setSelectedPhones(new Set());
    },
    onError: (err) => toast({ title: err instanceof Error ? err.message : "Failed", variant: "destructive" }),
  });

  const sendOrderReceivedMutation = useMutation({
    mutationFn: async (orderIdOrNumber: string | number) => {
      const res = await fetch("/api/whatsapp/send-order-received", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: String(orderIdOrNumber).trim() }),
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text();
        let msg = text;
        try {
          const err = JSON.parse(text);
          if (err.message) msg = err.message;
        } catch { /* ignore */ }
        throw new Error(msg);
      }
      return res.json();
    },
    onSuccess: () => toast({ title: "Order received notification sent" }),
    onError: (err) => toast({ title: err instanceof Error ? err.message : "Failed", variant: "destructive" }),
  });

  const sendOrderShippedMutation = useMutation({
    mutationFn: async (orderIdOrNumber: string | number) => {
      const res = await fetch("/api/whatsapp/send-order-shipped", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: String(orderIdOrNumber).trim() }),
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text();
        let msg = text;
        try {
          const err = JSON.parse(text);
          if (err.message) msg = err.message;
        } catch { /* ignore */ }
        throw new Error(msg);
      }
      return res.json();
    },
    onSuccess: () => toast({ title: "Order shipped notification sent" }),
    onError: (err) => toast({ title: err instanceof Error ? err.message : "Failed", variant: "destructive" }),
  });

  const handleSendMarketing = () => {
    const phonesFromManual = manualPhones.split(/[\n,;]/).map((p) => p.trim().replace(/\D/g, "")).filter(Boolean);
    const phones = Array.from(new Set([...Array.from(selectedPhones), ...phonesFromManual])).map((p) => (p.startsWith("965") ? p : `965${p}`));
    if (!phones.length || !message.trim()) {
      toast({ title: "Select recipients and enter a message", variant: "destructive" });
      return;
    }
    sendMarketingMutation.mutate({ phones, message: message.trim() });
  };

  const toggleCustomer = (phone: string) => {
    setSelectedPhones((prev) => {
      const next = new Set(prev);
      const normalized = phone.replace(/\D/g, "");
      if (next.has(normalized)) next.delete(normalized);
      else next.add(normalized);
      return next;
    });
  };

  const selectAll = () => {
    const all = customers.map((c) => c.phone.replace(/\D/g, ""));
    setSelectedPhones(new Set(all));
  };

  const isRtl = lang === "ar";

  return (
    <AdminLayout>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <MessageCircle className="h-7 w-7 text-green-600" />
          <h1 className="text-3xl font-serif font-bold text-gray-900">WhatsApp</h1>
        </div>
        <p className="text-gray-500">
          {isRtl ? "إرسال إشعارات الطلبات والتسويق عبر واتساب." : "Send order notifications and marketing via WhatsApp."}
        </p>
      </div>

      {!status.configured && (
        <div className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-sm flex items-start gap-3">
          <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900 mb-1">WhatsApp not configured</h3>
            <p className="text-sm text-amber-800 mb-3">
              Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM (or TWILIO_MESSAGING_SERVICE_SID). Create Content Templates in Twilio Console and set TWILIO_CONTENT_ORDER_RECEIVED, TWILIO_CONTENT_ORDER_SHIPPED, TWILIO_CONTENT_MARKETING.
            </p>
            <a
              href="https://www.twilio.com/docs/whatsapp/quickstart"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-amber-700 hover:underline"
            >
              Twilio WhatsApp setup →
            </a>
          </div>
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2 mb-12">
        <div className="bg-white border border-gray-200 p-6 rounded-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 bg-green-100 flex items-center justify-center">
              <Package className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <p className="font-semibold">Order received</p>
              <p className="text-sm text-gray-500">Sent automatically when payment succeeds, with invoice PDF</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 p-6 rounded-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 bg-blue-100 flex items-center justify-center">
              <Truck className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <p className="font-semibold">Order shipped</p>
              <p className="text-sm text-gray-500">Sent automatically when order status is set to Shipped</p>
            </div>
          </div>
        </div>
      </div>

      {status.configured && (
        <div className="space-y-8">
          <section className="bg-white border border-gray-200 rounded-sm p-6">
            <h2 className="text-xl font-serif font-semibold mb-4 flex items-center gap-2">
              <Mail className="h-5 w-5" /> Manual resend
            </h2>
            <p className="text-sm text-gray-500 mb-4">Resend order received or shipped notification for a specific order (e.g. for testing).</p>
            <div className="flex gap-4 items-end">
              <div>
                <Label>Order ID or number</Label>
                <Input
                  type="text"
                  placeholder="e.g. 123 or ORD-MM5K6HKG"
                  value={testOrderId}
                  onChange={(e) => setTestOrderId(e.target.value)}
                  className="w-48 rounded-none"
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => sendOrderReceivedMutation.mutate(testOrderId)} disabled={!testOrderId.trim() || sendOrderReceivedMutation.isPending}>
                Send order received
              </Button>
              <Button variant="outline" size="sm" onClick={() => sendOrderShippedMutation.mutate(testOrderId)} disabled={!testOrderId.trim() || sendOrderShippedMutation.isPending}>
                Send order shipped
              </Button>
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-sm p-6">
            <h2 className="text-xl font-serif font-semibold mb-4 flex items-center gap-2">
              <Send className="h-5 w-5" /> Marketing (manual)
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Send a marketing message to selected customers. Uses the marketing Content Template with your message as the body.
            </p>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Select customers</Label>
                  <Button variant="ghost" size="sm" onClick={selectAll}>Select all</Button>
                </div>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded p-2 space-y-2">
                  {customers.map((c) => {
                    const ph = c.phone.replace(/\D/g, "");
                    const isSelected = selectedPhones.has(ph);
                    return (
                      <label key={c.id ?? c.phone} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <Checkbox checked={isSelected} onCheckedChange={() => toggleCustomer(c.phone)} />
                        <span className="text-sm">{c.name}</span>
                        <span className="text-gray-500 text-xs">{c.phone}</span>
                      </label>
                    );
                  })}
                  {!customers.length && <p className="text-sm text-gray-500 py-2">No customers yet</p>}
                </div>
              </div>
              <div>
                <Label>Or paste phone numbers (one per line, comma or semicolon separated)</Label>
                <Textarea
                  placeholder="96512345678&#10;96587654321"
                  value={manualPhones}
                  onChange={(e) => setManualPhones(e.target.value)}
                  className="rounded-none min-h-[80px] mt-1"
                />
              </div>
              <div>
                <Label>Message</Label>
                <Textarea
                  placeholder="Your marketing message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="rounded-none min-h-[100px] mt-1"
                />
              </div>
              <Button onClick={handleSendMarketing} disabled={sendMarketingMutation.isPending || !message.trim()} className="gap-2">
                <Send className="h-4 w-4" /> Send
              </Button>
            </div>
          </section>
        </div>
      )}
    </AdminLayout>
  );
}
