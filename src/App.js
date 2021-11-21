import React, { useEffect, useReducer } from 'react';
import { API } from 'aws-amplify';
import { List, Input, Button } from 'antd';
import 'antd/dist/antd.css';
import { listNotes } from './graphql/queries';
import { onCreateNote } from './graphql/subscriptions';
import { createNote as CreateNote, deleteNote as DeleteNote, updateNote as UpdateNote } from './graphql/mutations';

import './App.css';

import { v4 as uuid } from 'uuid';

const styles = {
	container: { padding: 20, display: 'flex' },
	input: { marginBottom: 10 },
	item: { textAlign: 'left' },
	p: { color: '#1890ff' }
  
};

const CLIENT_ID = uuid();

export default function App() {
	/* Example of some basic state */
	const initialState = {
		notes: [],
		loading: true,
		error: false,
		form: { name: '', description: '' },
    hideCompleted: false
	};

	const [state, dispatch] = useReducer(reducer, initialState);

	function reducer(state, action) {
		switch (action.type) {
			case 'SET_NOTES':
				return { ...state, notes: action.notes, loading: false };
			case 'ERROR':
				return { ...state, loading: false, error: true };
			case 'ADD_NOTE':
				return { ...state, notes: [action.note, ...state.notes] };
			case 'RESET_FORM':
				return { ...state, form: initialState.form };
			case 'SET_INPUT':
				return { ...state, form: { ...state.form, [action.name]: action.value } };
			case 'TOGGLE_COMPLETED':
				return { ...state, hideCompleted: !state.hideCompleted };
			default:
				return state;
		}
	}

	async function fetchNotes() {
		try {
			const notesData = await API.graphql({
				query: listNotes
			});
			dispatch({ type: 'SET_NOTES', notes: notesData.data.listNotes.items });
		} catch (err) {
			console.log('error: ', err);
			dispatch({ type: 'ERROR' });
		}
	}

	async function createNote() {
		const { form } = state;
		if (!form.name || !form.description) {
			return alert('please enter a name and description');
		}
		const note = { ...form, clientId: CLIENT_ID, completed: false, id: uuid() };
		dispatch({ type: 'ADD_NOTE', note });
		dispatch({ type: 'RESET_FORM' });
		try {
			await API.graphql({
				query: CreateNote,
				variables: { input: note }
			});
			console.log('successfully created note!');
		} catch (err) {
			console.log('error: ', err);
		}
	}

	async function updateNote(note) {
		const index = state.notes.findIndex(n => n.id === note.id);
		const notes = [...state.notes];
		notes[index].completed = !note.completed;
		dispatch({ type: 'SET_NOTES', notes });
		try {
			await API.graphql({
				query: UpdateNote,
				variables: { input: { id: note.id, completed: notes[index].completed } }
			});
			console.log('note successfully updated!');
		} catch (err) {
			console.log('error: ', err);
		}
	}

	async function deleteNote({ id }) {
		const index = state.notes.findIndex(n => n.id === id);
		const notes = [...state.notes.slice(0, index), ...state.notes.slice(index + 1)];
		dispatch({ type: 'SET_NOTES', notes });
		try {
			await API.graphql({
				query: DeleteNote,
				variables: { input: { id } }
			});
			console.log('successfully deleted note!');
		} catch (err) {
			console.log({ err });
		}
	}

	useEffect(() => {
		fetchNotes();
		const subscription = API.graphql({
			query: onCreateNote
		}).subscribe({
			next: noteData => {
				const note = noteData.value.data.onCreateNote;
				if (CLIENT_ID === note.clientId) return;
				dispatch({ type: 'ADD_NOTE', note });
			}
		});
		return () => subscription.unsubscribe();
	}, []);

	function onChange(e) {
		dispatch({ type: 'SET_INPUT', name: e.target.name, value: e.target.value });
	}

	function toggleCompleted(e) {
		dispatch({ type: 'TOGGLE_COMPLETED' });
	}

	function renderItem(item) {
    if(item.completed && state.hideCompleted) {
      return(<></>);
    }
		return (
			<List.Item
				style={styles.item}
				actions={[
					<p style={styles.p} onClick={() => deleteNote(item)}>
						Delete
					</p>,
					<p style={styles.p} onClick={() => updateNote(item)}>
						{item.completed ? 'completed' : 'mark completed'}
					</p>
				]}
			>
				<List.Item.Meta title={item.name} description={item.description} />
			</List.Item>
		);
	}
  const createNoteWrapperStyles = {
    paddingLeft: '1rem'
  };
  const listNotesWrapperStyles = {
    width: '100%',
    paddingRight: '1rem'
  };
  const globalControlsWrapperStyles = {
    width: '100%',
    textAlign: 'center',
    color: '#1890ff'
  }
  const toggleInputStyles = {
    display: 'inline',
    width: '30px',
    verticalAlign: 'middle'
  }

	return (
    <div>
      <div style={globalControlsWrapperStyles}>
          <Input type="checkbox" onChange={toggleCompleted} style={toggleInputStyles} />
          {state.hideCompleted ? 'Show Completed' : 'Hide Completed'}
      </div>
      <div style={styles.container}>

        <List style={listNotesWrapperStyles} loading={state.loading} dataSource={state.notes} renderItem={renderItem} />

        <div style={createNoteWrapperStyles}>
          <Input onChange={onChange} value={state.form.name} placeholder="Note Name" name="name" style={styles.input} />
          <Input
            onChange={onChange}
            value={state.form.description}
            placeholder="Note description"
            name="description"
            style={styles.input}
          />
          <Button onClick={createNote} type="primary">
            Create Note
          </Button>
        </div>

      </div>
		</div>
	);
}
