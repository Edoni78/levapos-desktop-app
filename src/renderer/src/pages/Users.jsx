import { useEffect, useState } from 'react'
import { Button } from '../components/Button.jsx'
import { Card } from '../components/Card.jsx'
import { Input } from '../components/Input.jsx'
import { Modal } from '../components/Modal.jsx'
import { sq } from '../locale/sq.js'
import { api } from '../services/api.js'

const emptyForm = {
  fullName: '',
  username: '',
  password: '',
  role: 'Cashier',
}

export function UsersPage() {
  const [rows, setRows] = useState([])
  const [err, setErr] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)

  async function load() {
    setErr('')
    try {
      setRows(await api.usersGetAll())
    } catch (e) {
      setErr(e instanceof Error ? e.message : sq.users.loadFailed)
    }
  }

  useEffect(() => {
    let cancelled = false
    const tid = window.setTimeout(() => {
      void (async () => {
        setErr('')
        try {
          const data = await api.usersGetAll()
          if (!cancelled) setRows(data)
        } catch (e) {
          if (!cancelled) setErr(e instanceof Error ? e.message : sq.users.loadFailed)
        }
      })()
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(tid)
    }
  }, [])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(u) {
    setEditing(u)
    setForm({
      fullName: u.fullName,
      username: u.username,
      password: '',
      role: u.role,
    })
    setModalOpen(true)
  }

  async function saveUser(e) {
    e.preventDefault()
    setErr('')
    try {
      if (editing) {
        const payload = {
          id: editing.id,
          fullName: form.fullName,
          username: form.username,
          role: form.role,
        }
        if (form.password.trim()) payload.password = form.password
        await api.usersUpdate(payload)
      } else {
        await api.usersCreate({
          fullName: form.fullName,
          username: form.username,
          password: form.password,
          role: form.role,
        })
      }
      setModalOpen(false)
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : sq.users.saveFailed)
    }
  }

  async function onDelete(u) {
    if (!window.confirm(sq.users.deleteConfirm(u.username))) return
    setErr('')
    try {
      await api.usersDelete({ id: u.id })
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : sq.users.deleteFailed)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{sq.users.title}</h1>
          <p className="text-sm text-slate-600">{sq.users.subtitle}</p>
        </div>
        <Button type="button" size="lg" onClick={openCreate}>
          {sq.users.addUser}
        </Button>
      </div>
      {err ? <p className="text-sm text-rose-600">{err}</p> : null}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-4 font-medium">{sq.users.colName}</th>
                <th className="py-2 pr-4 font-medium">{sq.users.colUsername}</th>
                <th className="py-2 pr-4 font-medium">{sq.users.colRole}</th>
                <th className="py-2 font-medium"> </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-b border-slate-100">
                  <td className="py-3 pr-4 font-medium text-slate-900">{u.fullName}</td>
                  <td className="py-3 pr-4 font-mono text-xs">{u.username}</td>
                  <td className="py-3 pr-4">{sq.roles[u.role] ?? u.role}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="secondary" onClick={() => openEdit(u)}>
                        {sq.common.edit}
                      </Button>
                      <Button type="button" size="sm" variant="danger" onClick={() => void onDelete(u)}>
                        {sq.common.delete}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={modalOpen}
        title={editing ? sq.users.editUser : sq.users.newUser}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              {sq.common.cancel}
            </Button>
            <Button type="submit" form="user-form">
              {sq.common.save}
            </Button>
          </>
        }
      >
        <form id="user-form" className="space-y-3" onSubmit={saveUser}>
          <Input
            label={sq.users.fullName}
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            required
          />
          <Input
            label={sq.users.username}
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            required
          />
          <label className="block text-sm font-medium text-slate-700">{sq.users.role}</label>
          <select
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
          >
            <option value="Cashier">{sq.roles.Cashier}</option>
            <option value="Admin">{sq.roles.Admin}</option>
          </select>
          <Input
            label={editing ? sq.users.passwordOptional : sq.users.password}
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            required={!editing}
          />
        </form>
      </Modal>
    </div>
  )
}
