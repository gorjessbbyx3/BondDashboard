import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Clock, 
  MapPin, 
  Phone, 
  UserPlus, 
  Eye, 
  MessageSquare, 
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Calendar,
  Building,
  Users,
  Target,
  Search,
  Filter
} from 'lucide-react';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ArrestRecord {
  id: string;
  arrestDate: string;
  arrestTime: string;
  name: string;
  age?: number;
  address?: string;
  charges: string[];
  arrestingAgency: string;
  bookingNumber: string;
  bondAmount?: string;
  releaseStatus: 'in_custody' | 'released' | 'bonded_out';
  contactStatus: 'not_contacted' | 'contacted' | 'follow_up' | 'converted' | 'declined';
  contactedAt?: string;
  contactedBy?: string;
  contactNotes?: string;
  phoneNumber?: string;
  familyContacts?: string[];
  priority: 'low' | 'medium' | 'high';
  source: string;
  createdAt: string;
}

interface ContactLog {
  id: string;
  arrestRecordId: string;
  contactType: 'phone' | 'email' | 'visit' | 'family';
  contactedBy: string;
  contactDate: string;
  notes: string;
  outcome: 'no_answer' | 'conversation' | 'appointment' | 'declined' | 'converted';
  followUpRequired: boolean;
  followUpDate?: string;
}

export function RecentArrestLogs() {
  const [selectedRecord, setSelectedRecord] = useState<ArrestRecord | null>(null);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [contactForm, setContactForm] = useState({
    contactType: 'phone',
    notes: '',
    outcome: 'no_answer',
    followUpRequired: false,
    followUpDate: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [contactFilter, setContactFilter] = useState('all');
  const { toast } = useToast();

  // Fetch recent arrest logs
  const { data: arrestLogs, isLoading, refetch } = useQuery<ArrestRecord[]>({
    queryKey: ['/api/arrest-logs/recent'],
    refetchInterval: 300000 // Refresh every 5 minutes
  });

  // Fetch contact history for selected record
  const { data: contactHistory } = useQuery<ContactLog[]>({
    queryKey: ['/api/arrest-logs/contact-history', selectedRecord?.id],
    enabled: !!selectedRecord?.id
  });

  // Log contact attempt
  const logContactMutation = useMutation({
    mutationFn: async (contactData: any) => {
      const response = await fetch('/api/arrest-logs/log-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          arrestRecordId: selectedRecord?.id,
          ...contactData,
          contactedBy: 'Admin'
        })
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Contact Logged',
        description: 'Contact attempt has been recorded successfully'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/arrest-logs/recent'] });
      queryClient.invalidateQueries({ queryKey: ['/api/arrest-logs/contact-history'] });
      setShowContactDialog(false);
      setContactForm({
        contactType: 'phone',
        notes: '',
        outcome: 'no_answer',
        followUpRequired: false,
        followUpDate: ''
      });
    }
  });

  // Update contact status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ recordId, status }: { recordId: string; status: string }) => {
      const response = await fetch('/api/arrest-logs/update-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId, contactStatus: status })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/arrest-logs/recent'] });
    }
  });

  // Convert to client
  const convertToClientMutation = useMutation({
    mutationFn: async (recordId: string) => {
      const response = await fetch('/api/arrest-logs/convert-to-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arrestRecordId: recordId })
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Client Created',
        description: 'Arrest record has been converted to a new client'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/arrest-logs/recent'] });
    }
  });

  const filteredLogs = (arrestLogs || []).filter(log => {
    const matchesSearch = log.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.charges.some(charge => charge.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         log.bookingNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || log.releaseStatus === statusFilter;
    const matchesContact = contactFilter === 'all' || log.contactStatus === contactFilter;
    
    return matchesSearch && matchesStatus && matchesContact;
  });

  const getContactStatusColor = (status: string) => {
    switch (status) {
      case 'not_contacted': return 'bg-gray-100 text-gray-800';
      case 'contacted': return 'bg-blue-100 text-blue-800';
      case 'follow_up': return 'bg-yellow-100 text-yellow-800';
      case 'converted': return 'bg-green-100 text-green-800';
      case 'declined': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getReleaseStatusColor = (status: string) => {
    switch (status) {
      case 'in_custody': return 'bg-red-100 text-red-800';
      case 'released': return 'bg-green-100 text-green-800';
      case 'bonded_out': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleLogContact = () => {
    logContactMutation.mutate({
      ...contactForm,
      contactDate: new Date().toISOString()
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Recent Arrest Logs</h2>
          <p className="text-muted-foreground">
            Monitor recent arrests for potential client identification and outreach
          </p>
        </div>
        <Button 
          onClick={() => refetch()}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{arrestLogs?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Not Contacted</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {arrestLogs?.filter(log => log.contactStatus === 'not_contacted').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Potential opportunities</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Follow Up Required</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {arrestLogs?.filter(log => log.contactStatus === 'follow_up').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Converted</CardTitle>
            <Target className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {arrestLogs?.filter(log => log.contactStatus === 'converted').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Successful conversions</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Name, charges, booking #..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Release Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="in_custody">In Custody</SelectItem>
                  <SelectItem value="released">Released</SelectItem>
                  <SelectItem value="bonded_out">Bonded Out</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Contact Status</Label>
              <Select value={contactFilter} onValueChange={setContactFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Contact Status</SelectItem>
                  <SelectItem value="not_contacted">Not Contacted</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="follow_up">Follow Up</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button variant="outline" className="w-full">
                <Filter className="h-4 w-4 mr-2" />
                Reset Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Arrest Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Arrest Records</CardTitle>
          <CardDescription>
            Most recent arrests sorted by date. Click to view details and manage contact status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No arrest records found matching your filters
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Charges</TableHead>
                  <TableHead>Bond Amount</TableHead>
                  <TableHead>Release Status</TableHead>
                  <TableHead>Contact Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {new Date(record.arrestDate).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {record.arrestTime}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{record.name}</div>
                        {record.age && (
                          <div className="text-sm text-muted-foreground">
                            Age: {record.age}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {record.charges.slice(0, 2).map((charge, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {charge}
                          </Badge>
                        ))}
                        {record.charges.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{record.charges.length - 2} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {record.bondAmount ? (
                        <div className="font-medium">{record.bondAmount}</div>
                      ) : (
                        <span className="text-muted-foreground">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getReleaseStatusColor(record.releaseStatus)}>
                        {record.releaseStatus.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getContactStatusColor(record.contactStatus)}>
                        {record.contactStatus.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(record.priority)}>
                        {record.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedRecord(record);
                            setShowDetailsDialog(true);
                          }}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedRecord(record);
                            setShowContactDialog(true);
                          }}
                        >
                          <MessageSquare className="h-3 w-3" />
                        </Button>
                        {record.contactStatus !== 'converted' && (
                          <Button
                            size="sm"
                            onClick={() => convertToClientMutation.mutate(record.id)}
                            disabled={convertToClientMutation.isPending}
                          >
                            <UserPlus className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Contact Dialog */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Log Contact Attempt</DialogTitle>
            <DialogDescription>
              Record contact attempt for {selectedRecord?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Type</Label>
                <Select
                  value={contactForm.contactType}
                  onValueChange={(value) => setContactForm(prev => ({ ...prev, contactType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone">Phone Call</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="visit">In-Person Visit</SelectItem>
                    <SelectItem value="family">Family Contact</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Outcome</Label>
                <Select
                  value={contactForm.outcome}
                  onValueChange={(value) => setContactForm(prev => ({ ...prev, outcome: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_answer">No Answer</SelectItem>
                    <SelectItem value="conversation">Had Conversation</SelectItem>
                    <SelectItem value="appointment">Scheduled Appointment</SelectItem>
                    <SelectItem value="declined">Declined Services</SelectItem>
                    <SelectItem value="converted">Became Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Enter contact notes, conversation details, next steps..."
                value={contactForm.notes}
                onChange={(e) => setContactForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={4}
              />
            </div>

            {contactForm.outcome === 'conversation' && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="followUp"
                    checked={contactForm.followUpRequired}
                    onChange={(e) => setContactForm(prev => ({ ...prev, followUpRequired: e.target.checked }))}
                  />
                  <Label htmlFor="followUp">Follow-up required</Label>
                </div>
                
                {contactForm.followUpRequired && (
                  <div className="space-y-2">
                    <Label>Follow-up Date</Label>
                    <Input
                      type="date"
                      value={contactForm.followUpDate}
                      onChange={(e) => setContactForm(prev => ({ ...prev, followUpDate: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowContactDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleLogContact} disabled={logContactMutation.isPending}>
                {logContactMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Log Contact'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Arrest Record Details</DialogTitle>
            <DialogDescription>
              Complete information for {selectedRecord?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRecord && (
            <Tabs defaultValue="details" className="space-y-4">
              <TabsList>
                <TabsTrigger value="details">Arrest Details</TabsTrigger>
                <TabsTrigger value="contact">Contact History</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <div className="p-2 bg-gray-50 rounded">{selectedRecord.name}</div>
                  </div>
                  <div className="space-y-2">
                    <Label>Booking Number</Label>
                    <div className="p-2 bg-gray-50 rounded">{selectedRecord.bookingNumber}</div>
                  </div>
                  <div className="space-y-2">
                    <Label>Arrest Date</Label>
                    <div className="p-2 bg-gray-50 rounded">
                      {new Date(selectedRecord.arrestDate).toLocaleDateString()} at {selectedRecord.arrestTime}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Arresting Agency</Label>
                    <div className="p-2 bg-gray-50 rounded">{selectedRecord.arrestingAgency}</div>
                  </div>
                  <div className="space-y-2">
                    <Label>Bond Amount</Label>
                    <div className="p-2 bg-gray-50 rounded">{selectedRecord.bondAmount || 'Not set'}</div>
                  </div>
                  <div className="space-y-2">
                    <Label>Release Status</Label>
                    <div className="p-2 bg-gray-50 rounded">
                      <Badge className={getReleaseStatusColor(selectedRecord.releaseStatus)}>
                        {selectedRecord.releaseStatus.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Charges</Label>
                  <div className="p-2 bg-gray-50 rounded space-y-1">
                    {selectedRecord.charges.map((charge, index) => (
                      <Badge key={index} variant="outline">{charge}</Badge>
                    ))}
                  </div>
                </div>

                {selectedRecord.address && (
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <div className="p-2 bg-gray-50 rounded">{selectedRecord.address}</div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="contact" className="space-y-4">
                {contactHistory && contactHistory.length > 0 ? (
                  <div className="space-y-4">
                    {contactHistory.map((contact) => (
                      <Card key={contact.id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{contact.contactType}</Badge>
                                <Badge className={getContactStatusColor(contact.outcome)}>
                                  {contact.outcome.replace('_', ' ')}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(contact.contactDate).toLocaleString()} by {contact.contactedBy}
                              </div>
                              <div className="text-sm">{contact.notes}</div>
                              {contact.followUpRequired && (
                                <div className="text-sm text-yellow-600">
                                  Follow-up required: {contact.followUpDate && new Date(contact.followUpDate).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No contact history recorded
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}