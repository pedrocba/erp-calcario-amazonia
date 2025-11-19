import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Scale, Plus, Truck, User, AlertCircle, Printer, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatBRL } from "@/components/utils/formatters";

export default function WeighingFrente() {
  const queryClient = useQueryClient();
  const [selectedCompanyId] = useState(localStorage.getItem('selectedCompanyId'));
  const [isDriverDialogOpen, setIsDriverDialogOpen] = useState(false);
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [generatedTicket, setGeneratedTicket] = useState(null);

  const [formData, setFormData] = useState({
    client_id: "",
    sale_id: "",
    sale_item_index: null,
    driver_id: "",
    vehicle_id: "",
    tare_weight: 0,
    gross_weight: 0,
    notes: ""
  });

  const [driverFormData, setDriverFormData] = useState({
    name: "",
    cpf: "",
    phone: "",
    linked_carrier: ""
  });

  // Queries
  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.Contact.filter({ 
      is_active: true, 
      type: ['cliente', 'ambos'] 
    }),
    initialData: []
  });

  const { data: allSales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.filter({ 
      status: 'faturada'
    }, '-created_date'),
    initialData: []
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.filter({ is_active: true }),
    initialData: []
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.filter({ status: 'ativo' }),
    initialData: []
  });

  // Vendas filtradas pelo cliente selecionado com saldo
  const availableSales = useMemo(() => {
    if (!formData.client_id) return [];
    
    return allSales
      .filter(sale => sale.client_id === formData.client_id)
      .map(sale => {
        const itemsWithBalance = (sale.items || []).map((item, index) => {
          const withdrawn = item.quantity_withdrawn || 0;
          const balance = item.quantity - withdrawn;
          return { ...item, balance, index };
        }).filter(item => item.balance > 0);
        
        return { ...sale, itemsWithBalance };
      })
      .filter(sale => sale.itemsWithBalance.length > 0);
  }, [allSales, formData.client_id]);

  // Item selecionado
  const selectedSaleItem = useMemo(() => {
    if (!formData.sale_id || formData.sale_item_index === null) return null;
    const sale = availableSales.find(s => s.id === formData.sale_id);
    return sale?.itemsWithBalance[formData.sale_item_index] || null;
  }, [formData.sale_id, formData.sale_item_index, availableSales]);

  // Cálculo de peso líquido
  const netWeight = useMemo(() => {
    return formData.gross_weight - formData.tare_weight;
  }, [formData.gross_weight, formData.tare_weight]);

  // Mutation para criar motorista
  const createDriverMutation = useMutation({
    mutationFn: (data) => base44.entities.Driver.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['drivers']);
      setIsDriverDialogOpen(false);
      setDriverFormData({ name: "", cpf: "", phone: "", linked_carrier: "" });
      toast.success("Motorista cadastrado!");
    }
  });

  // Mutation para emitir ticket
  const emitTicketMutation = useMutation({
    mutationFn: async (data) => {
      // Gerar número do ticket
      const lastTicket = await base44.entities.WeighingTicket.list('-ticket_number', 1);
      const lastNumber = lastTicket[0]?.ticket_number || 'TICKET-00000';
      const nextNumber = parseInt(lastNumber.replace('TICKET-', '')) + 1;
      const ticketNumber = `TICKET-${String(nextNumber).padStart(5, '0')}`;

      // Buscar dados completos
      const sale = availableSales.find(s => s.id === data.sale_id);
      const driver = drivers.find(d => d.id === data.driver_id);
      const vehicle = vehicles.find(v => v.id === data.vehicle_id);
      const client = contacts.find(c => c.id === data.client_id);

      // Criar ticket
      const ticket = await base44.entities.WeighingTicket.create({
        ticket_number: ticketNumber,
        sale_id: data.sale_id,
        sale_reference: sale.reference,
        client_id: data.client_id,
        client_name: client?.name || '',
        product_id: selectedSaleItem.product_id,
        product_name: selectedSaleItem.product_name,
        driver_id: data.driver_id,
        driver_name: driver?.name || '',
        vehicle_id: data.vehicle_id,
        vehicle_plate: vehicle?.plate || '',
        bodywork_type: vehicle?.bodywork_type || '',
        tare_weight: data.tare_weight,
        gross_weight: data.gross_weight,
        net_weight: data.net_weight,
        weighing_datetime: new Date().toISOString(),
        company_id: selectedCompanyId,
        status: 'concluido',
        notes: data.notes
      });

      // Atualizar quantidade retirada na venda
      const updatedItems = [...sale.items];
      updatedItems[selectedSaleItem.index] = {
        ...updatedItems[selectedSaleItem.index],
        quantity_withdrawn: (updatedItems[selectedSaleItem.index].quantity_withdrawn || 0) + data.net_weight
      };

      await base44.entities.Sale.update(data.sale_id, {
        items: updatedItems,
        withdrawal_status: updatedItems.every(item => 
          (item.quantity_withdrawn || 0) >= item.quantity
        ) ? 'total' : 'parcial'
      });

      return { ticket, sale, driver, vehicle, client };
    },
    onSuccess: ({ ticket }) => {
      queryClient.invalidateQueries(['sales']);
      queryClient.invalidateQueries(['weighingTickets']);
      setGeneratedTicket(ticket);
      setIsTicketDialogOpen(true);
      resetForm();
      toast.success("✅ Ticket emitido com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao emitir ticket: " + error.message);
    }
  });

  const resetForm = () => {
    setFormData({
      client_id: "",
      sale_id: "",
      sale_item_index: null,
      driver_id: "",
      vehicle_id: "",
      tare_weight: 0,
      gross_weight: 0,
      notes: ""
    });
  };

  const handleVehicleChange = (vehicleId) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    setFormData({
      ...formData,
      vehicle_id: vehicleId,
      tare_weight: vehicle?.standard_tare_weight || 0
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validações
    if (!selectedSaleItem) {
      toast.error("Selecione um item da venda!");
      return;
    }

    if (netWeight <= 0) {
      toast.error("Peso líquido deve ser maior que zero!");
      return;
    }

    if (netWeight > selectedSaleItem.balance) {
      toast.error(`⚠️ Peso líquido (${netWeight}kg) excede o saldo do pedido (${selectedSaleItem.balance}kg)!`);
      return;
    }

    // Emitir ticket
    emitTicketMutation.mutate({
      ...formData,
      net_weight: netWeight
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Scale className="w-8 h-8 text-violet-600" />
          Frente de Balança
        </h1>
        <p className="text-slate-500 mt-1">Emissão de tickets de saída</p>
      </div>

      {/* Dialog Novo Motorista */}
      <Dialog open={isDriverDialogOpen} onOpenChange={setIsDriverDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastro Rápido de Motorista</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createDriverMutation.mutate(driverFormData); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome Completo *</Label>
              <Input
                required
                value={driverFormData.name}
                onChange={(e) => setDriverFormData({ ...driverFormData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input
                  value={driverFormData.cpf}
                  onChange={(e) => setDriverFormData({ ...driverFormData, cpf: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={driverFormData.phone}
                  onChange={(e) => setDriverFormData({ ...driverFormData, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Transportadora</Label>
              <Input
                value={driverFormData.linked_carrier}
                onChange={(e) => setDriverFormData({ ...driverFormData, linked_carrier: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsDriverDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Cadastrar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Ticket Gerado */}
      <Dialog open={isTicketDialogOpen} onOpenChange={setIsTicketDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>✅ Ticket Emitido com Sucesso!</DialogTitle>
          </DialogHeader>
          {generatedTicket && (
            <div className="space-y-4">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-6">
                  <div className="text-center mb-4">
                    <h2 className="text-2xl font-bold text-green-800">{generatedTicket.ticket_number}</h2>
                    <p className="text-sm text-green-600">
                      {new Date(generatedTicket.weighing_datetime).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-600">Cliente:</p>
                      <p className="font-bold">{generatedTicket.client_name}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Pedido:</p>
                      <p className="font-bold">{generatedTicket.sale_reference}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Produto:</p>
                      <p className="font-bold">{generatedTicket.product_name}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Motorista:</p>
                      <p className="font-bold">{generatedTicket.driver_name}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Veículo:</p>
                      <p className="font-bold">{generatedTicket.vehicle_plate}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Tipo:</p>
                      <p className="font-bold">{generatedTicket.bodywork_type}</p>
                    </div>
                    <div className="col-span-2 pt-4 border-t">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xs text-slate-600">Tara</p>
                          <p className="text-lg font-bold">{generatedTicket.tare_weight.toFixed(0)} kg</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-600">Bruto</p>
                          <p className="text-lg font-bold">{generatedTicket.gross_weight.toFixed(0)} kg</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-600">Líquido</p>
                          <p className="text-2xl font-bold text-green-600">
                            {generatedTicket.net_weight.toFixed(0)} kg
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsTicketDialogOpen(false)}>
                  Fechar
                </Button>
                <Button onClick={handlePrint} className="bg-violet-600 hover:bg-violet-700">
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir Ticket
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Formulário Principal */}
      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Coluna Esquerda */}
          <div className="space-y-6">
            {/* Seção Cliente e Pedido */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Cliente e Pedido
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  <Select
                    required
                    value={formData.client_id}
                    onValueChange={(value) => setFormData({ 
                      ...formData, 
                      client_id: value,
                      sale_id: "",
                      sale_item_index: null
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.client_id && availableSales.length > 0 && (
                  <>
                    <div className="space-y-2">
                      <Label>Pedido de Venda *</Label>
                      <Select
                        required
                        value={formData.sale_id}
                        onValueChange={(value) => setFormData({ 
                          ...formData, 
                          sale_id: value,
                          sale_item_index: null
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o pedido" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSales.map((sale) => (
                            <SelectItem key={sale.id} value={sale.id}>
                              {sale.reference} - {formatBRL(sale.total)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.sale_id && (
                      <div className="space-y-2">
                        <Label>Item do Pedido *</Label>
                        <Select
                          required
                          value={formData.sale_item_index?.toString()}
                          onValueChange={(value) => setFormData({ 
                            ...formData, 
                            sale_item_index: parseInt(value)
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o item" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableSales
                              .find(s => s.id === formData.sale_id)
                              ?.itemsWithBalance.map((item, idx) => (
                              <SelectItem key={idx} value={idx.toString()}>
                                {item.product_name} - Saldo: {item.balance.toFixed(0)} {item.unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </>
                )}

                {formData.client_id && availableSales.length === 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Nenhum pedido com saldo disponível para este cliente.
                    </AlertDescription>
                  </Alert>
                )}

                {selectedSaleItem && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-4">
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Produto:</span>
                          <span className="font-bold">{selectedSaleItem.product_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Saldo Restante:</span>
                          <span className="font-bold text-blue-600">
                            {selectedSaleItem.balance.toFixed(0)} {selectedSaleItem.unit}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>

            {/* Seção Transporte */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Informações de Transporte
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Motorista *</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsDriverDialogOpen(true)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Novo
                    </Button>
                  </div>
                  <Select
                    required
                    value={formData.driver_id}
                    onValueChange={(value) => setFormData({ ...formData, driver_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o motorista" />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers.map((driver) => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.name}
                          {driver.linked_carrier && ` - ${driver.linked_carrier}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Veículo *</Label>
                  <Select
                    required
                    value={formData.vehicle_id}
                    onValueChange={handleVehicleChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o veículo" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.plate} - {vehicle.brand} {vehicle.model}
                          {vehicle.bodywork_type && ` (${vehicle.bodywork_type})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coluna Direita */}
          <div className="space-y-6">
            {/* Seção Pesagem */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Scale className="w-5 h-5" />
                  Dados da Pesagem
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Peso de Entrada (Tara) - KG *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    required
                    value={formData.tare_weight}
                    onChange={(e) => setFormData({ ...formData, tare_weight: parseFloat(e.target.value) || 0 })}
                    className="text-lg font-bold"
                  />
                  <p className="text-xs text-slate-500">Peso do caminhão vazio</p>
                </div>

                <div className="space-y-2">
                  <Label>Peso de Saída (Bruto) - KG *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    required
                    value={formData.gross_weight}
                    onChange={(e) => setFormData({ ...formData, gross_weight: parseFloat(e.target.value) || 0 })}
                    className="text-lg font-bold"
                  />
                  <p className="text-xs text-slate-500">Peso do caminhão carregado</p>
                </div>

                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-green-700 mb-2">Peso Líquido</p>
                      <p className="text-4xl font-bold text-green-600">
                        {netWeight.toFixed(0)} <span className="text-2xl">kg</span>
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {selectedSaleItem && netWeight > selectedSaleItem.balance && (
                  <Alert className="bg-red-50 border-red-200">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      <strong>⚠️ Atenção!</strong> Peso líquido ({netWeight.toFixed(0)}kg) excede o saldo do pedido ({selectedSaleItem.balance.toFixed(0)}kg)
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Input
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Observações adicionais..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Botão Emitir */}
            <Button
              type="submit"
              size="lg"
              className="w-full bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-lg py-6"
              disabled={emitTicketMutation.isPending}
            >
              {emitTicketMutation.isPending ? (
                "Emitindo..."
              ) : (
                <>
                  <CheckCircle2 className="w-6 h-6 mr-2" />
                  Emitir Ticket de Saída
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}